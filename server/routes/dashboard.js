import express from 'express';
import { query } from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [lots, containers, movements, operations, maintenance] = await Promise.all([
      query(`SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_lots,
        COUNT(*) FILTER (WHERE status = 'bottled') as bottled_lots,
        SUM(current_volume_liters) FILTER (WHERE status = 'active') as total_volume,
        COUNT(DISTINCT vintage_year) as vintages_count
        FROM barbote_lots`),
      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'in_use') as in_use,
        COUNT(*) FILTER (WHERE status = 'available') as available,
        COUNT(*) FILTER (WHERE status = 'maintenance') as in_maintenance
        FROM barbote_containers`),
      query(`SELECT COUNT(*) as count, SUM(volume_liters) as total_volume
             FROM barbote_movements WHERE date > NOW() - INTERVAL '30 days'`),
      query(`SELECT COUNT(*) FILTER (WHERE status = 'planned') as planned,
                    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress
             FROM barbote_operations`),
      query(`SELECT COUNT(*) FILTER (WHERE status = 'planned') as upcoming
             FROM barbote_maintenance WHERE scheduled_date > NOW()`)
    ]);

    res.json({
      lots: lots.rows[0],
      containers: containers.rows[0],
      movements_30d: movements.rows[0],
      operations: operations.rows[0],
      maintenance: maintenance.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/dashboard/volume-chart
router.get('/volume-chart', verifyToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        DATE_TRUNC('day', date) as day,
        SUM(CASE WHEN movement_type = 'entree' THEN volume_liters ELSE 0 END) as volume_in,
        SUM(CASE WHEN movement_type IN ('sortie', 'perte') THEN volume_liters ELSE 0 END) as volume_out
      FROM barbote_movements
      WHERE date > NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', date)
      ORDER BY day
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/dashboard/lots-by-type
router.get('/lots-by-type', verifyToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT type, COUNT(*) as count, SUM(current_volume_liters) as total_volume
      FROM barbote_lots WHERE status = 'active'
      GROUP BY type ORDER BY total_volume DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', verifyToken, async (req, res) => {
  try {
    const [movements, operations] = await Promise.all([
      query(`SELECT m.movement_type, m.volume_liters, m.date, m.reason,
                    l.lot_number, l.name as lot_name, u.name as operator_name
             FROM barbote_movements m
             LEFT JOIN barbote_lots l ON m.lot_id = l.id
             LEFT JOIN barbote_users u ON m.operator_id = u.id
             ORDER BY m.date DESC LIMIT 10`),
      query(`SELECT o.operation_type, o.date, o.status, o.purpose,
                    l.lot_number, l.name as lot_name
             FROM barbote_operations o
             LEFT JOIN barbote_lots l ON o.lot_id = l.id
             ORDER BY o.date DESC LIMIT 10`)
    ]);

    res.json({
      movements: movements.rows,
      operations: operations.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
