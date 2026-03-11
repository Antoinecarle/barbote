import express from 'express';
import OpenAI from 'openai';
import { query } from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const WINE_SYSTEM_PROMPT = `Tu es un assistant oenologue expert en traçabilité cuverie et vinification.
Tu aides les vignerons et oenologues à :
- Analyser les lots de vin et leurs caractéristiques
- Proposer des plans d'assemblage optimaux avec plusieurs scénarios
- Interpréter les analyses chimiques
- Recalculer les matrices d'analyses après assemblage
- Répondre aux questions sur la traçabilité et les mouvements
- Donner des recommandations sur les opérations à effectuer

Tu communiques en français, de façon professionnelle mais accessible.
Tu cites toujours tes sources de données (lots, analyses, mouvements).
Tu expliques tes calculs et raisonnements.
Tu respectes les règles réglementaires viticoles françaises (IGP, AOC, etc.).

Format de réponse: Markdown structuré avec tableaux si nécessaire.`;

// GET /api/ai/conversations
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
        (SELECT content FROM barbote_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM barbote_conversations c
       WHERE c.user_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/ai/conversations
router.post('/conversations', verifyToken, async (req, res) => {
  try {
    const { title, context_type, context_ids } = req.body;
    const result = await query(
      `INSERT INTO barbote_conversations (user_id, title, context_type, context_ids)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, title || 'Nouvelle conversation', context_type || 'general', JSON.stringify(context_ids || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/ai/conversations/:id/messages
router.get('/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM barbote_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/ai/chat - Send a message with streaming
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { conversation_id, message, context } = req.body;

    // Fetch conversation history
    const historyRes = await query(
      'SELECT role, content FROM barbote_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 20',
      [conversation_id]
    );

    // Build context from cellar data
    let contextData = '';
    if (context?.lot_ids?.length > 0) {
      const lotsRes = await query(
        'SELECT lot_number, name, type, vintage_year, current_volume_liters, appellation, analysis_matrix FROM barbote_lots WHERE id = ANY($1)',
        [context.lot_ids]
      );
      contextData += '\n## Lots en contexte:\n' +
        lotsRes.rows.map(l =>
          `- Lot ${l.lot_number} (${l.name}): ${l.type} ${l.vintage_year}, Volume: ${l.current_volume_liters}L, Appellation: ${l.appellation || 'N/A'}`
        ).join('\n');
    }

    // Get recent cellar summary for general context
    const summaryRes = await query(`
      SELECT
        (SELECT COUNT(*) FROM barbote_lots WHERE status = 'active') as active_lots,
        (SELECT SUM(current_volume_liters) FROM barbote_lots WHERE status = 'active') as total_volume,
        (SELECT COUNT(*) FROM barbote_containers WHERE status = 'in_use') as containers_in_use
    `);
    const summary = summaryRes.rows[0];
    contextData += `\n## Résumé cave: ${summary.active_lots} lots actifs, ${Math.round(summary.total_volume || 0)}L total, ${summary.containers_in_use} contenants en cours`;

    const messages = [
      { role: 'system', content: WINE_SYSTEM_PROMPT + '\n' + contextData },
      ...historyRes.rows,
      { role: 'user', content: message }
    ];

    // Save user message
    await query(
      'INSERT INTO barbote_messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [conversation_id, 'user', message]
    );

    // Stream response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      stream: true,
      max_tokens: 2000
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Save assistant response
    await query(
      'INSERT INTO barbote_messages (conversation_id, role, content, model) VALUES ($1, $2, $3, $4)',
      [conversation_id, 'assistant', fullResponse, 'gpt-4o-mini']
    );

    // Update conversation metadata
    await query(
      `UPDATE barbote_conversations SET message_count = message_count + 2,
       last_message_at = NOW(),
       title = CASE WHEN title = 'Nouvelle conversation' THEN $1 ELSE title END
       WHERE id = $2`,
      [message.substring(0, 80) + '...', conversation_id]
    );

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'Erreur IA: ' + err.message });
  }
});

// POST /api/ai/assemblage - Generate assemblage scenarios
router.post('/assemblage', verifyToken, async (req, res) => {
  try {
    const { target_volume, target_analysis, candidate_lot_ids, constraints, name } = req.body;

    // Fetch lot details and analyses
    const lotsRes = await query(
      `SELECT l.*,
        (SELECT row_to_json(a) FROM barbote_analyses a WHERE a.lot_id = l.id ORDER BY a.analysis_date DESC LIMIT 1) as latest_analysis
       FROM barbote_lots l WHERE l.id = ANY($1) AND l.status = 'active'`,
      [candidate_lot_ids]
    );

    if (lotsRes.rows.length === 0) {
      return res.status(400).json({ error: 'Aucun lot disponible trouvé' });
    }

    // Create assemblage plan
    const planRes = await query(
      `INSERT INTO barbote_assemblage_plans (name, target_volume_liters, target_analysis, constraints, candidate_lots, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'pending_ai', $6) RETURNING *`,
      [name || 'Plan d\'assemblage', target_volume, JSON.stringify(target_analysis || {}),
       JSON.stringify(constraints || {}), JSON.stringify(lotsRes.rows.map(l => l.id)), req.user.id]
    );
    const plan = planRes.rows[0];

    // Build prompt for AI scenarios
    const lotsDescription = lotsRes.rows.map(l => {
      const a = l.latest_analysis;
      return `- Lot ${l.lot_number} (${l.name}): ${l.type} ${l.vintage_year || ''}, ${l.appellation || ''}, Volume dispo: ${l.current_volume_liters}L, Cépages: ${JSON.stringify(l.grape_varieties)}${a ? `, Alcool: ${a.alcohol_percent}%, AT: ${a.total_acidity_gl}g/L, AV: ${a.volatile_acidity_gl}g/L, pH: ${a.ph}, SO2L: ${a.free_so2_mgl}mg/L` : ''}`;
    }).join('\n');

    const prompt = `Tu es oenologue expert. Génère 3 scénarios d'assemblage optimaux.

Objectif: ${target_volume}L de vin assemblé
Appellation cible: ${target_analysis?.appellation || 'Non définie'}
Objectifs analytiques: ${JSON.stringify(target_analysis)}
Contraintes: ${JSON.stringify(constraints)}

Lots disponibles:
${lotsDescription}

Pour chaque scénario, fournis en JSON strict:
{
  "scenarios": [
    {
      "id": "scenario_1",
      "name": "Nom du scénario",
      "lots": [{"lot_id": "ID", "lot_number": "NUM", "percentage": 50, "volume_liters": 5000}],
      "predicted_analysis": {"alcohol_percent": 13.5, "total_acidity_gl": 5.2, "volatile_acidity_gl": 0.4, "ph": 3.5, "free_so2_mgl": 25},
      "quality_score": 85,
      "profile": "Description du profil organoleptique attendu",
      "reasoning": "Justification détaillée du choix",
      "risks": ["Risque 1"],
      "advantages": ["Avantage 1"]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tu es oenologue expert. Réponds UNIQUEMENT en JSON valide sans markdown.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    const aiResult = JSON.parse(response.choices[0].message.content);

    // Update plan with scenarios
    await query(
      `UPDATE barbote_assemblage_plans SET scenarios = $1, status = 'scenarios_ready',
       ai_model_used = 'gpt-4o-mini', updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(aiResult.scenarios || []), plan.id]
    );

    res.json({
      plan_id: plan.id,
      scenarios: aiResult.scenarios || [],
      lots_analyzed: lotsRes.rows.length
    });
  } catch (err) {
    console.error('Assemblage AI error:', err);
    res.status(500).json({ error: 'Erreur IA assemblage: ' + err.message });
  }
});

// GET /api/ai/assemblage/:id - Get assemblage plan
router.get('/assemblage/:id', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM barbote_assemblage_plans WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plan non trouvé' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/ai/assemblage - List all plans
router.get('/assemblage', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT ap.*, u.name as created_by_name
       FROM barbote_assemblage_plans ap
       LEFT JOIN barbote_users u ON ap.created_by = u.id
       ORDER BY ap.created_at DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/ai/query - Natural language query about cellar data
router.post('/query', verifyToken, async (req, res) => {
  try {
    const { question } = req.body;

    // Fetch relevant context
    const [lotsRes, movementsRes, analysesRes] = await Promise.all([
      query('SELECT lot_number, name, type, vintage_year, current_volume_liters, status, appellation FROM barbote_lots WHERE status = \'active\' LIMIT 30'),
      query('SELECT movement_type, volume_liters, date, reason FROM barbote_movements ORDER BY date DESC LIMIT 20'),
      query('SELECT l.lot_number, a.alcohol_percent, a.total_acidity_gl, a.ph, a.free_so2_mgl, a.analysis_date FROM barbote_analyses a JOIN barbote_lots l ON a.lot_id = l.id ORDER BY a.analysis_date DESC LIMIT 20')
    ]);

    const context = `
Données cave actuelles:
LOTS ACTIFS: ${JSON.stringify(lotsRes.rows)}
MOUVEMENTS RÉCENTS: ${JSON.stringify(movementsRes.rows)}
ANALYSES RÉCENTES: ${JSON.stringify(analysesRes.rows)}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: WINE_SYSTEM_PROMPT + '\n' + context },
        { role: 'user', content: question }
      ],
      max_tokens: 1500
    });

    res.json({
      answer: response.choices[0].message.content,
      tokens_used: response.usage?.total_tokens
    });
  } catch (err) {
    console.error('AI query error:', err);
    res.status(500).json({ error: 'Erreur IA: ' + err.message });
  }
});

export default router;
