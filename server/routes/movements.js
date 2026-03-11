import express from 'express';
import { query, getClient } from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/movements
router.get('/', verifyToken, async (req, res) => {
  try {
    const { lot_id, type, from_date, to_date, limit = 100 } = req.query;
    let q = `
      SELECT m.*,
        l.lot_number, l.name as lot_name,
        fc.code as from_container_code, fc.name as from_container_name,
        tc.code as to_container_code, tc.name as to_container_name,
        u.name as operator_name
      FROM barbote_movements m
      LEFT JOIN barbote_lots l ON m.lot_id = l.id
      LEFT JOIN barbote_containers fc ON m.from_container_id = fc.id
      LEFT JOIN barbote_containers tc ON m.to_container_id = tc.id
      LEFT JOIN barbote_users u ON m.operator_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (lot_id) { params.push(lot_id); q += ` AND (m.lot_id = $${params.length} OR m.target_lot_id = $${params.length})`; }
    if (type) { params.push(type); q += ` AND m.movement_type = $${params.length}`; }
    if (from_date) { params.push(from_date); q += ` AND m.date >= $${params.length}`; }
    if (to_date) { params.push(to_date); q += ` AND m.date <= $${params.length}`; }
    params.push(parseInt(limit));
    q += ` ORDER BY m.date DESC LIMIT $${params.length}`;

    const result = await query(q, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/movements - Record a movement
router.post('/', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const {
      movement_type, lot_id, from_container_id, to_container_id,
      volume_liters, date, inputs, reason, notes,
      source_lots, target_lot_id, volume_loss_liters
    } = req.body;

    // Create movement record
    const movRes = await client.query(
      `INSERT INTO barbote_movements (
        movement_type, lot_id, from_container_id, to_container_id,
        volume_liters, date, operator_id, inputs, reason, notes,
        source_lots, target_lot_id, volume_loss_liters, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [movement_type, lot_id, from_container_id, to_container_id,
       volume_liters, date || new Date(), req.user.id,
       JSON.stringify(inputs || []), reason, notes,
       JSON.stringify(source_lots || []), target_lot_id,
       volume_loss_liters || 0, req.user.id]
    );

    const movement = movRes.rows[0];

    // Update volumes based on movement type
    if (movement_type === 'transfert' && lot_id) {
      if (from_container_id) {
        await client.query(
          'UPDATE barbote_lot_containers SET is_current = false WHERE lot_id = $1 AND container_id = $2 AND is_current = true',
          [lot_id, from_container_id]
        );
        await client.query(
          'UPDATE barbote_containers SET current_volume_liters = current_volume_liters - $1 WHERE id = $2',
          [volume_liters, from_container_id]
        );
      }
      if (to_container_id) {
        await client.query(
          `INSERT INTO barbote_lot_containers (lot_id, container_id, volume_liters)
           VALUES ($1, $2, $3)`,
          [lot_id, to_container_id, volume_liters]
        );
        await client.query(
          'UPDATE barbote_containers SET current_volume_liters = current_volume_liters + $1, status = \'in_use\' WHERE id = $2',
          [volume_liters, to_container_id]
        );
      }
    }

    // For assemblage - create new lot from source lots
    if (movement_type === 'assemblage' && source_lots && target_lot_id) {
      let totalVolume = 0;
      for (const src of source_lots) {
        totalVolume += parseFloat(src.volume);
        await client.query(
          'UPDATE barbote_lots SET current_volume_liters = current_volume_liters - $1, updated_at = NOW() WHERE id = $2',
          [src.volume, src.lot_id]
        );
      }
      await client.query(
        'UPDATE barbote_lots SET current_volume_liters = current_volume_liters + $1, updated_at = NOW() WHERE id = $2',
        [totalVolume - (volume_loss_liters || 0), target_lot_id]
      );
    }

    // For perte (loss)
    if (movement_type === 'perte' && lot_id) {
      await client.query(
        'UPDATE barbote_lots SET current_volume_liters = current_volume_liters - $1, updated_at = NOW() WHERE id = $2',
        [volume_liters, lot_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(movement);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// GET /api/movements/stats
router.get('/stats/overview', verifyToken, async (req, res) => {
  try {
    const [movTypes, recentMov, volumeBalance] = await Promise.all([
      query(`SELECT movement_type, COUNT(*) as count, SUM(volume_liters) as total_volume
             FROM barbote_movements WHERE date > NOW() - INTERVAL '30 days'
             GROUP BY movement_type ORDER BY count DESC`),
      query(`SELECT m.*, l.lot_number, l.name as lot_name, u.name as operator_name
             FROM barbote_movements m
             LEFT JOIN barbote_lots l ON m.lot_id = l.id
             LEFT JOIN barbote_users u ON m.operator_id = u.id
             ORDER BY m.date DESC LIMIT 10`),
      query(`SELECT SUM(CASE WHEN movement_type = 'entree' THEN volume_liters ELSE 0 END) as total_in,
                    SUM(CASE WHEN movement_type IN ('sortie','perte') THEN volume_liters ELSE 0 END) as total_out
             FROM barbote_movements WHERE date > NOW() - INTERVAL '30 days'`)
    ]);

    res.json({
      movement_types: movTypes.rows,
      recent_movements: recentMov.rows,
      volume_balance: volumeBalance.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
