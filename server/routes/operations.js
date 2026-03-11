import express from 'express';
import { query } from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/operations
router.get('/', verifyToken, async (req, res) => {
  try {
    const { lot_id, status } = req.query;
    let q = `
      SELECT o.*, l.lot_number, l.name as lot_name, c.code as container_code,
             u.name as operator_name
      FROM barbote_operations o
      LEFT JOIN barbote_lots l ON o.lot_id = l.id
      LEFT JOIN barbote_containers c ON o.container_id = c.id
      LEFT JOIN barbote_users u ON o.operator_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (lot_id) { params.push(lot_id); q += ` AND o.lot_id = $${params.length}`; }
    if (status) { params.push(status); q += ` AND o.status = $${params.length}`; }
    q += ' ORDER BY o.date DESC LIMIT 100';
    const result = await query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/operations
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      operation_type, lot_id, container_id, date, products_used,
      dose_per_hl, volume_treated_liters, temperature_c,
      purpose, expected_effect, status, notes
    } = req.body;

    const result = await query(
      `INSERT INTO barbote_operations (
        operation_type, lot_id, container_id, date, products_used,
        dose_per_hl, volume_treated_liters, temperature_c,
        purpose, expected_effect, status, notes, operator_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [operation_type, lot_id, container_id, date || new Date(),
       JSON.stringify(products_used || []), dose_per_hl, volume_treated_liters,
       temperature_c, purpose, expected_effect, status || 'planned', notes, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/operations/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { status, actual_effect, notes } = req.body;
    const result = await query(
      'UPDATE barbote_operations SET status=$1, actual_effect=$2, notes=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
      [status, actual_effect, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Opération non trouvée' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
