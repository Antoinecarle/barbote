import express from 'express';
import { query } from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/maintenance
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT m.*, c.code as container_code, c.name as container_name,
             u.name as created_by_name
      FROM barbote_maintenance m
      JOIN barbote_containers c ON m.container_id = c.id
      LEFT JOIN barbote_users u ON m.created_by = u.id
      ORDER BY m.scheduled_date DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/maintenance
router.post('/', verifyToken, async (req, res) => {
  try {
    const { container_id, maintenance_type, scheduled_date, description, technician, cost, notes } = req.body;
    const result = await query(
      `INSERT INTO barbote_maintenance (container_id, maintenance_type, scheduled_date, description, technician, cost, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [container_id, maintenance_type, scheduled_date, description, technician, cost, notes, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/maintenance/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { status, completed_date, actual_effect, notes, cost } = req.body;
    const result = await query(
      'UPDATE barbote_maintenance SET status=$1, completed_date=$2, notes=$3, cost=$4 WHERE id=$5 RETURNING *',
      [status, completed_date, notes, cost, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Maintenance non trouvée' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
