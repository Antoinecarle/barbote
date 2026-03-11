import express from 'express';
import { query } from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/analyses
router.get('/', verifyToken, async (req, res) => {
  try {
    const { lot_id, from_date, to_date } = req.query;
    let q = `
      SELECT a.*, l.lot_number, l.name as lot_name, u.name as created_by_name
      FROM barbote_analyses a
      LEFT JOIN barbote_lots l ON a.lot_id = l.id
      LEFT JOIN barbote_users u ON a.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (lot_id) { params.push(lot_id); q += ` AND a.lot_id = $${params.length}`; }
    if (from_date) { params.push(from_date); q += ` AND a.analysis_date >= $${params.length}`; }
    if (to_date) { params.push(to_date); q += ` AND a.analysis_date <= $${params.length}`; }
    q += ' ORDER BY a.analysis_date DESC LIMIT 200';

    const result = await query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/analyses
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      lot_id, container_id, analysis_date, analysis_type, lab_name,
      alcohol_percent, residual_sugar_gl, total_acidity_gl, volatile_acidity_gl,
      ph, free_so2_mgl, total_so2_mgl, malic_acid_gl, lactic_acid_gl,
      tartaric_acid_gl, citric_acid_gl, glucose_fructose_gl, color_intensity,
      color_hue, turbidity_ntu, temperature_c, density, extended_params, comments
    } = req.body;

    const result = await query(
      `INSERT INTO barbote_analyses (
        lot_id, container_id, analysis_date, analysis_type, lab_name,
        alcohol_percent, residual_sugar_gl, total_acidity_gl, volatile_acidity_gl,
        ph, free_so2_mgl, total_so2_mgl, malic_acid_gl, lactic_acid_gl,
        tartaric_acid_gl, citric_acid_gl, glucose_fructose_gl, color_intensity,
        color_hue, turbidity_ntu, temperature_c, density, extended_params, comments,
        created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING *`,
      [lot_id, container_id, analysis_date || new Date(), analysis_type || 'standard', lab_name,
       alcohol_percent, residual_sugar_gl, total_acidity_gl, volatile_acidity_gl,
       ph, free_so2_mgl, total_so2_mgl, malic_acid_gl, lactic_acid_gl,
       tartaric_acid_gl, citric_acid_gl, glucose_fructose_gl, color_intensity,
       color_hue, turbidity_ntu, temperature_c, density,
       JSON.stringify(extended_params || {}), comments, req.user.id]
    );

    // Update lot analysis_matrix with latest values
    const analysisData = {
      alcohol_percent, residual_sugar_gl, total_acidity_gl, volatile_acidity_gl,
      ph, free_so2_mgl, total_so2_mgl, last_analysis_date: new Date().toISOString()
    };
    await query(
      'UPDATE barbote_lots SET analysis_matrix = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(analysisData), lot_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/analyses/calculate-assemblage - Calculate predicted analysis after assemblage
router.post('/calculate-assemblage', verifyToken, async (req, res) => {
  try {
    const { lots } = req.body; // [{lot_id, volume_liters}]
    if (!lots || lots.length === 0) {
      return res.status(400).json({ error: 'Lots requis pour le calcul' });
    }

    let totalVolume = 0;
    const lotAnalyses = [];

    for (const item of lots) {
      totalVolume += parseFloat(item.volume_liters);
      const analysisRes = await query(
        'SELECT * FROM barbote_analyses WHERE lot_id = $1 ORDER BY analysis_date DESC LIMIT 1',
        [item.lot_id]
      );
      if (analysisRes.rows.length > 0) {
        lotAnalyses.push({ ...item, analysis: analysisRes.rows[0] });
      }
    }

    if (lotAnalyses.length === 0) {
      return res.status(400).json({ error: 'Aucune analyse disponible pour ces lots' });
    }

    // Weighted average calculation
    const fields = ['alcohol_percent', 'residual_sugar_gl', 'total_acidity_gl',
      'volatile_acidity_gl', 'ph', 'free_so2_mgl', 'total_so2_mgl',
      'malic_acid_gl', 'lactic_acid_gl', 'color_intensity', 'color_hue'];

    const predicted = {};
    for (const field of fields) {
      let weightedSum = 0;
      let totalWeight = 0;
      for (const item of lotAnalyses) {
        const val = parseFloat(item.analysis[field]);
        if (!isNaN(val) && val !== null) {
          weightedSum += val * parseFloat(item.volume_liters);
          totalWeight += parseFloat(item.volume_liters);
        }
      }
      predicted[field] = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 1000) / 1000 : null;
    }

    res.json({
      total_volume: totalVolume,
      predicted_analysis: predicted,
      lots_included: lotAnalyses.length,
      calculation_method: 'weighted_average'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de calcul' });
  }
});

export default router;
