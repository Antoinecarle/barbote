import express from 'express';
import { query } from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/containers
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, type } = req.query;
    let q = `
      SELECT c.*,
        COALESCE(
          json_agg(
            json_build_object('lot_id', lc.lot_id, 'lot_number', l.lot_number, 'volume', lc.volume_liters)
          ) FILTER (WHERE lc.id IS NOT NULL AND lc.is_current = true),
          '[]'
        ) as current_lots
      FROM barbote_containers c
      LEFT JOIN barbote_lot_containers lc ON c.id = lc.container_id AND lc.is_current = true
      LEFT JOIN barbote_lots l ON lc.lot_id = l.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); q += ` AND c.status = $${params.length}`; }
    if (type) { params.push(type); q += ` AND c.type = $${params.length}`; }
    q += ' GROUP BY c.id ORDER BY c.code';

    const result = await query(q, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/containers/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'lot_id', lc.lot_id, 'lot_number', l.lot_number,
              'lot_name', l.name, 'volume', lc.volume_liters,
              'filling_date', lc.filling_date
            )
          ) FILTER (WHERE lc.id IS NOT NULL AND lc.is_current = true),
          '[]'
        ) as current_lots
       FROM barbote_containers c
       LEFT JOIN barbote_lot_containers lc ON c.id = lc.container_id AND lc.is_current = true
       LEFT JOIN barbote_lots l ON lc.lot_id = l.id
       WHERE c.id = $1 GROUP BY c.id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contenant non trouvé' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/containers
router.post('/', verifyToken, async (req, res) => {
  try {
    const { code, name, type, capacity_liters, location, material, notes } = req.body;
    const result = await query(
      `INSERT INTO barbote_containers (code, name, type, capacity_liters, location, material, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [code, name, type, capacity_liters, location, material, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Code de contenant déjà utilisé' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/containers/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, type, capacity_liters, location, status, material, notes } = req.body;
    const result = await query(
      `UPDATE barbote_containers SET name=$1, type=$2, capacity_liters=$3, location=$4,
       status=$5, material=$6, notes=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name, type, capacity_liters, location, status, material, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contenant non trouvé' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/containers/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await query('DELETE FROM barbote_containers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Contenant supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
