import express from 'express';
import { query } from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';
import {
  openai,
  PROMPT_REGISTRY,
  withAIGuards,
  calculateAssemblageFallback,
} from '../services/ai-service.js';

const router = express.Router();

const WINE_SYSTEM_PROMPT = PROMPT_REGISTRY.WINE_ASSISTANT.content;

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
      model: 'gpt-5-mini-2025-08-07',
      messages,
      stream: true,
      max_completion_tokens: 2000
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
      [conversation_id, 'assistant', fullResponse, 'gpt-5-mini-2025-08-07']
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

// POST /api/ai/assemblage - Generate assemblage scenarios (with fallback)
router.post('/assemblage', verifyToken, async (req, res) => {
  const { target_volume, target_analysis, candidate_lot_ids, constraints, name } = req.body;

  if (!candidate_lot_ids?.length || candidate_lot_ids.length < 2) {
    return res.status(400).json({ error: 'Au moins 2 lots candidats requis' });
  }
  if (!target_volume || Number(target_volume) <= 0) {
    return res.status(400).json({ error: 'Volume cible invalide' });
  }

  try {
    // Fetch lot details and analyses
    const lotsRes = await query(
      `SELECT l.*,
        (SELECT row_to_json(a) FROM barbote_analyses a WHERE a.lot_id = l.id ORDER BY a.analysis_date DESC LIMIT 1) as latest_analysis
       FROM barbote_lots l WHERE l.id = ANY($1) AND l.status = 'active'`,
      [candidate_lot_ids]
    );

    if (lotsRes.rows.length === 0) {
      return res.status(400).json({ error: 'Aucun lot actif trouvé parmi les candidats' });
    }

    // Create assemblage plan
    const planRes = await query(
      `INSERT INTO barbote_assemblage_plans (name, target_volume_liters, target_analysis, constraints, candidate_lots, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'pending_ai', $6) RETURNING *`,
      [
        name || `Plan d'assemblage ${new Date().toLocaleDateString('fr-FR')}`,
        target_volume,
        JSON.stringify(target_analysis || {}),
        JSON.stringify(constraints || {}),
        JSON.stringify(lotsRes.rows.map(l => l.id)),
        req.user.id,
      ]
    );
    const plan = planRes.rows[0];

    let aiResult;
    let usedFallback = false;
    let modelUsed = 'gpt-5-mini-2025-08-07';

    // Try AI first, fall back to manual calculation
    try {
      const lotsDescription = lotsRes.rows.map(l => {
        const a = l.latest_analysis;
        return `- Lot ${l.lot_number} (${l.name}): ${l.type} ${l.vintage_year || ''}, ${l.appellation || ''}, ` +
          `Volume dispo: ${l.current_volume_liters}L, Cépages: ${JSON.stringify(l.grape_varieties)}` +
          (a ? `, Alcool: ${a.alcohol_percent}%, AT: ${a.total_acidity_gl}g/L, AV: ${a.volatile_acidity_gl}g/L, pH: ${a.ph}, SO2L: ${a.free_so2_mgl}mg/L` : ' (pas d\'analyse récente)');
      }).join('\n');

      const promptContent = PROMPT_REGISTRY.ASSEMBLAGE_SCENARIOS.content(
        lotsDescription, target_volume, target_analysis, constraints
      );

      aiResult = await withAIGuards(
        async () => {
          const response = await openai.chat.completions.create({
            model: 'gpt-5-mini-2025-08-07',
            messages: [
              { role: 'system', content: 'Tu es oenologue expert. Réponds UNIQUEMENT en JSON valide sans markdown.' },
              { role: 'user', content: promptContent },
            ],
            max_completion_tokens: 3000,
            response_format: { type: 'json_object' },
          });
          return JSON.parse(response.choices[0].message.content);
        },
        'assemblage_scenarios',
        { plan_id: plan.id, lots_count: lotsRes.rows.length }
      );
    } catch (aiErr) {
      console.warn('[AI fallback] OpenAI failed for assemblage, using manual calculation:', aiErr.message);
      aiResult = calculateAssemblageFallback(lotsRes.rows, Number(target_volume), target_analysis);
      usedFallback = true;
      modelUsed = 'manual_fallback_v1';
    }

    // Update plan with scenarios
    await query(
      `UPDATE barbote_assemblage_plans
       SET scenarios = $1, status = 'scenarios_ready',
           ai_model_used = $2, ai_prompt_version = $3, updated_at = NOW()
       WHERE id = $4`,
      [
        JSON.stringify(aiResult.scenarios || []),
        modelUsed,
        PROMPT_REGISTRY.ASSEMBLAGE_SCENARIOS.version,
        plan.id,
      ]
    );

    res.json({
      plan_id: plan.id,
      scenarios: aiResult.scenarios || [],
      lots_analyzed: lotsRes.rows.length,
      used_fallback: usedFallback,
      model_used: modelUsed,
      prompt_version: PROMPT_REGISTRY.ASSEMBLAGE_SCENARIOS.version,
    });
  } catch (err) {
    console.error('Assemblage AI error:', err);
    res.status(500).json({ error: 'Erreur assemblage: ' + err.message });
  }
});

// POST /api/ai/matrix/recalculate - Calculate blended wine matrix from lot proportions
// Body: { lots: [{lot_id, percentage}] }
// Returns: { matrix, lot_details }
router.post('/matrix/recalculate', verifyToken, async (req, res) => {
  try {
    const { lots } = req.body; // [{lot_id, percentage}]
    if (!Array.isArray(lots) || lots.length === 0) {
      return res.status(400).json({ error: 'Paramètre lots requis' });
    }

    // Validate percentages sum to 100 (±1 tolerance)
    const totalPct = lots.reduce((s, l) => s + Number(l.percentage || 0), 0);
    if (Math.abs(totalPct - 100) > 1) {
      return res.status(400).json({ error: `La somme des pourcentages doit être 100% (reçu: ${totalPct}%)` });
    }

    const lotIds = lots.map(l => l.lot_id);

    // Fetch lots with their latest analysis
    const lotsRes = await query(
      `SELECT l.id, l.lot_number, l.name, l.current_volume_liters,
        a.alcohol_percent, a.total_acidity_gl, a.volatile_acidity_gl,
        a.ph, a.free_so2_mgl, a.total_so2_mgl, a.residual_sugar_gl,
        a.malic_acid_gl, a.lactic_acid_gl, a.tartaric_acid_gl,
        a.density, a.analysis_date
       FROM barbote_lots l
       LEFT JOIN LATERAL (
         SELECT * FROM barbote_analyses
         WHERE lot_id = l.id
         ORDER BY analysis_date DESC LIMIT 1
       ) a ON true
       WHERE l.id = ANY($1)`,
      [lotIds]
    );

    const lotMap = Object.fromEntries(lotsRes.rows.map(r => [r.id, r]));
    const PARAMS = [
      'alcohol_percent', 'total_acidity_gl', 'ph',
      'free_so2_mgl', 'total_so2_mgl', 'residual_sugar_gl',
      'malic_acid_gl', 'lactic_acid_gl', 'tartaric_acid_gl', 'density'
    ];

    const matrix = {};
    for (const param of PARAMS) {
      if (param === 'volatile_acidity_gl') {
        // Volatile acidity: take max (not averaged)
        const vals = lots.map(l => Number(lotMap[l.lot_id]?.[param])).filter(v => !isNaN(v));
        if (vals.length) matrix[param] = Math.max(...vals);
      } else {
        let weightedSum = 0, totalWeight = 0;
        for (const l of lots) {
          const lot = lotMap[l.lot_id];
          const val = lot?.[param];
          if (val != null && !isNaN(Number(val))) {
            const pct = Number(l.percentage);
            weightedSum += Number(val) * pct;
            totalWeight += pct;
          }
        }
        if (totalWeight > 0) {
          matrix[param] = Math.round((weightedSum / totalWeight) * 1000) / 1000;
        }
      }
    }

    // Also compute volatile_acidity_gl max
    const vaVals = lots.map(l => Number(lotMap[l.lot_id]?.volatile_acidity_gl)).filter(v => !isNaN(v) && v > 0);
    if (vaVals.length) matrix.volatile_acidity_gl = Math.max(...vaVals);

    res.json({
      matrix,
      lot_details: lots.map(l => ({
        lot_id: l.lot_id,
        lot_number: lotMap[l.lot_id]?.lot_number || '?',
        name: lotMap[l.lot_id]?.name || '?',
        percentage: l.percentage,
        has_analysis: !!(lotMap[l.lot_id]?.analysis_date),
        analysis_date: lotMap[l.lot_id]?.analysis_date || null,
      })),
    });
  } catch (err) {
    console.error('Matrix recalculation error:', err);
    res.status(500).json({ error: 'Erreur recalcul matrice: ' + err.message });
  }
});

// POST /api/ai/assemblage/:id/execute - Execute a scenario: create lot + movements
// Body: { scenario_id, new_lot_name, notes }
router.post('/assemblage/:id/execute', verifyToken, async (req, res) => {
  try {
    const { scenario_id, new_lot_name, notes } = req.body;
    if (!scenario_id) return res.status(400).json({ error: 'scenario_id requis' });

    // Fetch the assemblage plan
    const planRes = await query('SELECT * FROM barbote_assemblage_plans WHERE id = $1', [req.params.id]);
    if (planRes.rows.length === 0) return res.status(404).json({ error: 'Plan non trouvé' });
    const plan = planRes.rows[0];

    if (plan.status === 'executed') {
      return res.status(409).json({ error: 'Ce plan a déjà été exécuté' });
    }

    const scenarios = plan.scenarios || [];
    const scenario = scenarios.find(s => s.id === scenario_id);
    if (!scenario) return res.status(404).json({ error: 'Scénario non trouvé' });

    const scenarioLots = scenario.lots ?? scenario.blend ?? [];
    if (scenarioLots.length === 0) {
      return res.status(400).json({ error: 'Le scénario ne contient aucun lot' });
    }

    // Validate source lot volumes
    const lotIds = scenarioLots.map(l => l.lot_id);
    const sourceLotsRes = await query(
      'SELECT id, lot_number, current_volume_liters FROM barbote_lots WHERE id = ANY($1)',
      [lotIds]
    );
    const lotVolumeMap = Object.fromEntries(sourceLotsRes.rows.map(r => [r.id, r]));

    for (const sl of scenarioLots) {
      const available = Number(lotVolumeMap[sl.lot_id]?.current_volume_liters ?? 0);
      const needed = Number(sl.volume_liters ?? 0);
      if (needed > available + 1) { // 1L tolerance for rounding
        return res.status(400).json({
          error: `Volume insuffisant pour lot ${lotVolumeMap[sl.lot_id]?.lot_number ?? sl.lot_id}: besoin ${needed}L, disponible ${available}L`
        });
      }
    }

    const totalVolume = scenarioLots.reduce((s, l) => s + Number(l.volume_liters ?? 0), 0);

    // Create the new assembled lot
    const newLotRes = await query(
      `INSERT INTO barbote_lots
         (lot_number, name, type, initial_volume_liters, current_volume_liters,
          analysis_matrix, quality_score, parent_lots, origin_lot_ids,
          notes, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11)
       RETURNING *`,
      [
        `ASS-${Date.now()}`,
        new_lot_name || `Assemblage - ${plan.name}`,
        plan.target_analysis?.type || 'rouge',
        totalVolume,
        totalVolume,
        JSON.stringify(scenario.predicted_analysis || {}),
        scenario.quality_score || null,
        JSON.stringify(scenarioLots.map(l => ({
          lot_id: l.lot_id,
          lot_number: l.lot_number,
          percentage: l.percentage,
          volume_liters: l.volume_liters,
        }))),
        lotIds,
        notes || `Créé depuis plan assemblage IA: ${plan.name} — Scénario: ${scenario.name}`,
        req.user.id,
      ]
    );
    const newLot = newLotRes.rows[0];

    // Deduct volumes from source lots
    for (const sl of scenarioLots) {
      await query(
        `UPDATE barbote_lots
         SET current_volume_liters = current_volume_liters - $1, updated_at = NOW()
         WHERE id = $2`,
        [Number(sl.volume_liters ?? 0), sl.lot_id]
      );
    }

    // Create a movement record for the assemblage
    await query(
      `INSERT INTO barbote_movements
         (movement_type, volume_liters, source_lots, target_lot_id, date,
          operator_id, post_analysis, reason, notes, validated, validated_by, validated_at, created_by)
       VALUES ('assemblage',$1,$2,$3,NOW(),$4,$5,$6,$7,true,$4,NOW(),$4)`,
      [
        totalVolume,
        JSON.stringify(scenarioLots.map(l => ({
          lot_id: l.lot_id,
          lot_number: l.lot_number,
          volume: l.volume_liters,
          percentage: l.percentage,
        }))),
        newLot.id,
        req.user.id,
        JSON.stringify(scenario.predicted_analysis || {}),
        `Exécution plan assemblage IA: ${plan.name}`,
        notes || `Scénario "${scenario.name}" — Score qualité: ${scenario.quality_score ?? 'N/A'}`,
      ]
    );

    // Mark plan as executed
    await query(
      `UPDATE barbote_assemblage_plans
       SET status = 'executed', executed_scenario_id = $1, executed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [scenario_id, plan.id]
    );

    res.json({
      success: true,
      new_lot: newLot,
      movement_created: true,
      plan_id: plan.id,
      scenario_used: scenario.name,
      volume_assembled: totalVolume,
    });
  } catch (err) {
    console.error('Assemblage execute error:', err);
    res.status(500).json({ error: 'Erreur exécution assemblage: ' + err.message });
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
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: WINE_SYSTEM_PROMPT + '\n' + context },
        { role: 'user', content: question }
      ],
      max_completion_tokens: 1500
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

// GET /api/ai/conversations/:id/synthesis - Generate markdown synthesis of a conversation
router.get('/conversations/:id/synthesis', verifyToken, async (req, res) => {
  try {
    const convId = req.params.id;

    // Fetch conversation metadata
    const convRes = await query(
      'SELECT * FROM barbote_conversations WHERE id = $1 AND user_id = $2',
      [convId, req.user.id]
    );
    if (convRes.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }
    const conv = convRes.rows[0];

    // Fetch all messages
    const msgRes = await query(
      'SELECT role, content, created_at FROM barbote_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [convId]
    );
    if (msgRes.rows.length === 0) {
      return res.status(400).json({ error: 'La conversation est vide' });
    }

    // Build conversation transcript for AI
    const transcript = msgRes.rows
      .map(m => `**${m.role === 'user' ? 'Utilisateur' : 'Assistant'}** (${new Date(m.created_at).toLocaleString('fr-FR')})\n${m.content}`)
      .join('\n\n---\n\n');

    const synthesisPrompt = `Tu es un oenologue expert. Génère une synthèse professionnelle en Markdown de la conversation suivante.

La synthèse doit inclure :
1. **Résumé exécutif** — Problématique principale abordée (2-3 phrases)
2. **Points clés analysés** — Lots, analyses, volumes, paramètres discutés (tableau si pertinent)
3. **Recommandations** — Opérations préconisées, ajustements SO₂, assemblages suggérés
4. **Points de vigilance** — Risques identifiés, paramètres hors normes
5. **Actions à entreprendre** — Liste numérotée des actions prioritaires

Format : Markdown structuré, professionnel, en français.
Date de génération : ${new Date().toLocaleDateString('fr-FR')}
Titre : "${conv.title || 'Synthèse cave'}"

--- CONVERSATION ---
${transcript}
--- FIN ---`;

    const aiRes = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: 'Tu es oenologue expert. Génère des synthèses professionnelles en Markdown structuré.' },
        { role: 'user', content: synthesisPrompt }
      ],
      max_completion_tokens: 2500
    });

    const content = aiRes.choices[0].message.content;
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `synthese-cave-${dateStr}.md`;

    res.json({ content, filename });
  } catch (err) {
    console.error('Synthesis error:', err);
    res.status(500).json({ error: 'Erreur génération synthèse: ' + err.message });
  }
});

// GET /api/ai/metrics - AI quality metrics dashboard
router.get('/metrics', verifyToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        operation,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE success = true) as success_count,
        COUNT(*) FILTER (WHERE success = false) as error_count,
        ROUND(AVG(latency_ms)) as avg_latency_ms,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms)) as p50_ms,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)) as p95_ms,
        MAX(latency_ms) as max_latency_ms,
        ROUND(100.0 * COUNT(*) FILTER (WHERE success = true) / COUNT(*), 1) as success_rate_pct
      FROM barbote_ai_metrics
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY operation
      ORDER BY total_calls DESC
    `);

    const recentErrors = await query(`
      SELECT operation, error_message, created_at
      FROM barbote_ai_metrics
      WHERE success = false AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      period: '7 days',
      by_operation: result.rows,
      recent_errors: recentErrors.rows,
      prompt_versions: Object.entries(Object.fromEntries(
        Object.entries(PROMPT_REGISTRY).map(([k, v]) => [k, v.version])
      )),
    });
  } catch (err) {
    // Table may not exist yet
    if (err.message?.includes('does not exist')) {
      return res.json({ period: '7 days', by_operation: [], recent_errors: [], prompt_versions: [] });
    }
    res.status(500).json({ error: 'Erreur métriques IA: ' + err.message });
  }
});

// GET /api/ai/prompt-registry - List available prompt versions
router.get('/prompt-registry', verifyToken, async (req, res) => {
  const registry = Object.entries(PROMPT_REGISTRY).map(([key, prompt]) => ({
    key,
    id: prompt.id,
    version: prompt.version,
    is_template: typeof prompt.content === 'function',
  }));
  res.json(registry);
});

export default router;
