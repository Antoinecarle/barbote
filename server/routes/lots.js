import express from 'express';
import { query, getClient } from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/lots
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, vintage_year, type } = req.query;
    let q = `
      SELECT l.*,
        COALESCE(
          json_agg(
            json_build_object('container_id', lc.container_id, 'code', c.code,
              'name', c.name, 'volume', lc.volume_liters)
          ) FILTER (WHERE lc.id IS NOT NULL AND lc.is_current = true),
          '[]'
        ) as current_containers,
        (SELECT row_to_json(a) FROM barbote_analyses a
          WHERE a.lot_id = l.id ORDER BY a.analysis_date DESC LIMIT 1) as latest_analysis
      FROM barbote_lots l
      LEFT JOIN barbote_lot_containers lc ON l.id = lc.lot_id AND lc.is_current = true
      LEFT JOIN barbote_containers c ON lc.container_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); q += ` AND l.status = $${params.length}`; }
    if (vintage_year) { params.push(vintage_year); q += ` AND l.vintage_year = $${params.length}`; }
    if (type) { params.push(type); q += ` AND l.type = $${params.length}`; }
    q += ' GROUP BY l.id ORDER BY l.created_at DESC';

    const result = await query(q, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/lots/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [lotRes, movementsRes, analysesRes, containersRes] = await Promise.all([
      query('SELECT * FROM barbote_lots WHERE id = $1', [req.params.id]),
      query(`SELECT m.*, u.name as operator_name
             FROM barbote_movements m
             LEFT JOIN barbote_users u ON m.operator_id = u.id
             WHERE m.lot_id = $1 OR m.target_lot_id = $1
             ORDER BY m.date DESC LIMIT 50`, [req.params.id]),
      query('SELECT * FROM barbote_analyses WHERE lot_id = $1 ORDER BY analysis_date DESC', [req.params.id]),
      query(`SELECT c.*, lc.volume_liters, lc.filling_date, lc.is_current
             FROM barbote_lot_containers lc
             JOIN barbote_containers c ON lc.container_id = c.id
             WHERE lc.lot_id = $1 ORDER BY lc.filling_date DESC`, [req.params.id])
    ]);

    if (lotRes.rows.length === 0) return res.status(404).json({ error: 'Lot non trouvé' });

    const lot = lotRes.rows[0];

    // Fetch parent lot details for traceability
    let parentLots = [];
    if (lot.parent_lots && lot.parent_lots.length > 0) {
      const parentIds = lot.parent_lots.map(p => p.lot_id);
      const parentRes = await query(
        'SELECT id, lot_number, name, type, vintage_year, appellation FROM barbote_lots WHERE id = ANY($1)',
        [parentIds]
      );
      parentLots = parentRes.rows;
    }

    res.json({
      ...lot,
      movements: movementsRes.rows,
      analyses: analysesRes.rows,
      containers: containersRes.rows,
      parent_lot_details: parentLots
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/lots
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      lot_number, name, type, appellation, vintage_year, grape_varieties,
      initial_volume_liters, harvest_date, notes, container_id
    } = req.body;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const lotRes = await client.query(
        `INSERT INTO barbote_lots (
          lot_number, name, type, appellation, vintage_year, grape_varieties,
          initial_volume_liters, current_volume_liters, harvest_date, notes, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10) RETURNING *`,
        [lot_number, name, type, appellation, vintage_year,
          JSON.stringify(grape_varieties || []), initial_volume_liters,
          harvest_date, notes, req.user.id]
      );

      const lot = lotRes.rows[0];

      if (container_id) {
        await client.query(
          `INSERT INTO barbote_lot_containers (lot_id, container_id, volume_liters)
           VALUES ($1, $2, $3)`,
          [lot.id, container_id, initial_volume_liters]
        );
        await client.query(
          `UPDATE barbote_containers SET current_volume_liters = current_volume_liters + $1,
           status = 'in_use' WHERE id = $2`,
          [initial_volume_liters, container_id]
        );
      }

      await client.query('COMMIT');
      res.status(201).json(lot);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Numéro de lot déjà utilisé' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/lots/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const {
      name, type, appellation, vintage_year, grape_varieties,
      status, quality_score, notes, analysis_matrix
    } = req.body;
    const result = await query(
      `UPDATE barbote_lots SET name=$1, type=$2, appellation=$3, vintage_year=$4,
       grape_varieties=$5, status=$6, quality_score=$7, notes=$8, analysis_matrix=$9,
       updated_at=NOW() WHERE id=$10 RETURNING *`,
      [name, type, appellation, vintage_year, JSON.stringify(grape_varieties),
       status, quality_score, notes, JSON.stringify(analysis_matrix), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lot non trouvé' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/lots/:id/traceability - Full origin traceability
router.get('/:id/traceability', verifyToken, async (req, res) => {
  try {
    const buildTree = async (lotId, depth = 0, visited = new Set()) => {
      if (depth > 10 || visited.has(lotId)) return null;
      visited.add(lotId);

      const lotRes = await query(
        'SELECT id, lot_number, name, type, vintage_year, appellation, current_volume_liters, status, parent_lots, grape_varieties FROM barbote_lots WHERE id = $1',
        [lotId]
      );
      if (lotRes.rows.length === 0) return null;

      const lot = lotRes.rows[0];
      const children = [];

      if (lot.parent_lots && lot.parent_lots.length > 0) {
        for (const parent of lot.parent_lots) {
          const childTree = await buildTree(parent.lot_id, depth + 1, visited);
          if (childTree) {
            children.push({ ...childTree, percentage: parent.percentage, volume: parent.volume });
          }
        }
      }

      const movements = await query(
        `SELECT movement_type, date, volume_liters, reason FROM barbote_movements
         WHERE lot_id = $1 ORDER BY date DESC LIMIT 10`,
        [lotId]
      );

      return { ...lot, origins: children, movements: movements.rows };
    };

    const tree = await buildTree(req.params.id);
    if (!tree) return res.status(404).json({ error: 'Lot non trouvé' });
    res.json(tree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
