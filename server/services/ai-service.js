/**
 * Barbote AI Service — Versioned prompts, evaluation logging, fallback strategy
 *
 * Architecture:
 *   1. Versioned prompts registry (stored in code, versionable via git)
 *   2. AI call wrapper with retry + fallback + metrics
 *   3. Manual calculation fallback for assemblage (no OpenAI needed)
 *   4. Response quality logging
 */

import OpenAI from 'openai';
import { query } from '../db/index.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// =============================================================================
// PROMPT REGISTRY — versioned, testable prompts
// =============================================================================

export const PROMPT_REGISTRY = {
  WINE_ASSISTANT: {
    version: '1.2.0',
    id: 'wine-assistant-system',
    content: `Tu es un assistant oenologue expert en traçabilité cuverie et vinification française.

Tu aides les vignerons et oenologues à :
- Analyser les lots de vin et leurs caractéristiques analytiques
- Proposer des plans d'assemblage optimaux avec plusieurs scénarios
- Interpréter les analyses chimiques (alcool, acidités, SO₂, pH, sucres)
- Recalculer les matrices d'analyses après assemblage (pondération volumétrique)
- Répondre aux questions sur la traçabilité et les mouvements de cave
- Donner des recommandations sur les opérations à effectuer
- Vérifier la conformité réglementaire (doses SO₂, acidité volatile max, etc.)

Règles de communication :
- Langue : français, professionnel mais accessible
- Toujours citer tes sources de données (n° lot, date analyse)
- Expliquer les calculs et raisonnements
- Respecter les normes viticoles françaises (IGP, AOC, OIV)
- Signaler toute anomalie ou non-conformité détectée

Format de réponse : Markdown structuré avec tableaux si pertinent.
Limites : Ne pas inventer de données non fournies dans le contexte.`,
  },

  ASSEMBLAGE_SCENARIOS: {
    version: '1.3.0',
    id: 'assemblage-scenarios',
    content: (lotsDescription, targetVolume, targetAnalysis, constraints) => `
Tu es oenologue expert. Génère exactement 3 scénarios d'assemblage distincts et optimaux.

OBJECTIF: ${targetVolume}L de vin assemblé
APPELLATION CIBLE: ${targetAnalysis?.appellation || 'Non définie'}
MILLÉSIME CIBLE: ${targetAnalysis?.vintage_year || 'Non défini'}
OBJECTIFS ANALYTIQUES: ${JSON.stringify(targetAnalysis)}
CONTRAINTES: ${JSON.stringify(constraints || {})}

LOTS DISPONIBLES:
${lotsDescription}

RÈGLES D'ASSEMBLAGE:
- La somme des pourcentages doit être exactement 100%
- Les volumes doivent respecter les disponibilités de chaque lot
- Les 3 scénarios doivent être réellement différents (pas des variations mineures)
- Scénario 1: Optimisé pour la qualité/complexité
- Scénario 2: Optimisé pour l'équilibre analytique (alcool/acidité/SO₂)
- Scénario 3: Optimisé pour le rapport qualité/volume disponible

Calcule la matrice d'analyses en utilisant la pondération volumétrique:
  param_assemblage = Σ(param_lot_i × volume_lot_i) / Σ(volume_lot_i)
Note: volatile_acidity_gl = max des lots sources (non moyennée)

Réponds UNIQUEMENT en JSON valide, sans markdown ni explication:
{
  "scenarios": [
    {
      "id": "scenario_1",
      "name": "Nom évocateur du scénario",
      "lots": [{"lot_id": "uuid", "lot_number": "NUM", "percentage": 50, "volume_liters": 5000}],
      "predicted_analysis": {
        "alcohol_percent": 13.5,
        "total_acidity_gl": 5.2,
        "volatile_acidity_gl": 0.4,
        "ph": 3.45,
        "free_so2_mgl": 22,
        "residual_sugar_gl": 1.8
      },
      "quality_score": 85,
      "profile": "Description du profil organoleptique attendu (2-3 phrases)",
      "reasoning": "Justification détaillée du choix des proportions",
      "risks": ["Risque identifié 1"],
      "advantages": ["Avantage principal 1", "Avantage 2"]
    }
  ]
}`,
  },

  SYNTHESIS: {
    version: '1.1.0',
    id: 'conversation-synthesis',
    content: (transcript, convTitle, date) => `
Tu es oenologue expert. Génère une synthèse professionnelle en Markdown de la conversation suivante.

La synthèse doit inclure :
1. **Résumé exécutif** — Problématique principale abordée (2-3 phrases max)
2. **Points clés analysés** — Lots, analyses, volumes, paramètres discutés (tableau si pertinent)
3. **Recommandations** — Opérations préconisées, ajustements SO₂, assemblages suggérés
4. **Points de vigilance** — Risques identifiés, paramètres hors normes (⚠️ si urgent)
5. **Actions à entreprendre** — Liste numérotée des actions prioritaires avec délai suggéré

Format : Markdown structuré, professionnel, en français.
Date de génération : ${date}
Titre : "${convTitle}"

--- CONVERSATION ---
${transcript}
--- FIN ---`,
  },
};

// =============================================================================
// AI CALL WRAPPER — retry + timeout + fallback + metrics
// =============================================================================

const AI_TIMEOUT_MS = 30000; // 30s timeout
const MAX_RETRIES = 2;

/**
 * Wraps an OpenAI call with timeout, retry, and logging
 * @param {Function} callFn - Async function that calls OpenAI
 * @param {string} operation - Operation name for logging
 * @param {Object} metadata - Additional metadata for logging
 */
export async function withAIGuards(callFn, operation, metadata = {}) {
  const startTime = Date.now();
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI_TIMEOUT')), AI_TIMEOUT_MS)
      );
      const result = await Promise.race([callFn(), timeoutPromise]);

      const latencyMs = Date.now() - startTime;
      await logAICall({ operation, success: true, latencyMs, attempt, ...metadata });

      return result;
    } catch (err) {
      lastError = err;
      const isTimeout = err.message === 'AI_TIMEOUT';
      const isRetryable = isTimeout || err.status === 429 || err.status >= 500;

      await logAICall({
        operation,
        success: false,
        latencyMs: Date.now() - startTime,
        attempt,
        error: err.message,
        isTimeout,
        ...metadata
      });

      if (!isRetryable || attempt === MAX_RETRIES) break;

      // Exponential backoff before retry
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError;
}

/**
 * Log AI call metrics to DB
 */
async function logAICall({ operation, success, latencyMs, attempt, error, ...metadata }) {
  try {
    await query(
      `INSERT INTO barbote_ai_metrics (operation, success, latency_ms, attempt, error_message, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT DO NOTHING`,
      [operation, success, latencyMs, attempt, error || null, JSON.stringify(metadata)]
    ).catch(() => {}); // Non-blocking, don't fail if table doesn't exist yet
  } catch {
    // Metrics logging is non-critical
  }
}

// =============================================================================
// MANUAL FALLBACK — Assemblage without OpenAI
// =============================================================================

/**
 * Calculates assemblage scenarios manually using weighted averages
 * Used as fallback when OpenAI is unavailable or times out
 *
 * @param {Array} lots - Array of lot objects with latest_analysis
 * @param {number} targetVolume - Target volume in liters
 * @param {Object} targetAnalysis - Target analysis objectives
 * @returns {Object} - { scenarios: [...] }
 */
export function calculateAssemblageFallback(lots, targetVolume, targetAnalysis = {}) {
  if (lots.length < 2) {
    throw new Error('Au moins 2 lots requis pour un assemblage');
  }

  // Filter lots with sufficient volume
  const availableLots = lots.filter(l => Number(l.current_volume_liters) > 0);

  /**
   * Calculate weighted analysis for a set of lot proportions
   * @param {Array} lotsWithRatios - [{lot, ratio (0-1)}]
   */
  function calcWeightedAnalysis(lotsWithRatios) {
    const analysis = {};
    const params = [
      'alcohol_percent', 'total_acidity_gl', 'ph', 'free_so2_mgl',
      'total_so2_mgl', 'residual_sugar_gl', 'malic_acid_gl', 'lactic_acid_gl', 'density'
    ];

    let totalWeight = 0;
    const weights = lotsWithRatios.map(({ lot, ratio }) => {
      const vol = ratio * targetVolume;
      totalWeight += vol;
      return { lot, vol };
    });

    for (const param of params) {
      if (param === 'volatile_acidity_gl') {
        // Take max value (not averaged) for volatile acidity
        const values = lotsWithRatios
          .map(({ lot }) => lot.latest_analysis?.[param])
          .filter(v => v != null);
        if (values.length) analysis[param] = Math.max(...values);
      } else {
        const weightedSum = weights.reduce((sum, { lot, vol }) => {
          const val = lot.latest_analysis?.[param];
          return val != null ? sum + (Number(val) * vol) : sum;
        }, 0);
        const validWeight = weights.reduce((sum, { lot, vol }) => {
          return lot.latest_analysis?.[param] != null ? sum + vol : sum;
        }, 0);
        if (validWeight > 0) {
          analysis[param] = Math.round((weightedSum / validWeight) * 100) / 100;
        }
      }
    }
    return analysis;
  }

  /**
   * Score a predicted analysis vs targets
   */
  function scoreAnalysis(predicted) {
    let score = 75; // Base score
    const targets = targetAnalysis || {};

    if (targets.alcohol_min && predicted.alcohol_percent < targets.alcohol_min) score -= 15;
    if (targets.alcohol_max && predicted.alcohol_percent > targets.alcohol_max) score += 0;
    if (predicted.volatile_acidity_gl > 0.6) score -= 20; // Non-conformité
    if (predicted.free_so2_mgl < 15) score -= 10; // SO₂ bas
    if (predicted.free_so2_mgl > 20 && predicted.free_so2_mgl < 35) score += 5; // SO₂ optimal

    return Math.min(100, Math.max(0, score));
  }

  const totalAvailable = availableLots.reduce((s, l) => s + Number(l.current_volume_liters), 0);
  const scenarios = [];

  // Scenario 1: Equal proportions across all lots
  const equalRatios = availableLots.map(lot => ({
    lot,
    ratio: 1 / availableLots.length,
    volume_liters: Math.round(targetVolume / availableLots.length),
  }));
  const pred1 = calcWeightedAnalysis(equalRatios.map(r => ({ lot: r.lot, ratio: r.ratio })));
  scenarios.push({
    id: 'scenario_1',
    name: 'Assemblage équilibré',
    lots: equalRatios.map(r => ({
      lot_id: r.lot.id,
      lot_number: r.lot.lot_number,
      percentage: Math.round(100 / availableLots.length),
      volume_liters: r.volume_liters,
    })),
    predicted_analysis: pred1,
    quality_score: scoreAnalysis(pred1),
    profile: 'Assemblage proportionnel — profil équilibré tirant le meilleur de chaque lot.',
    reasoning: 'Calcul automatique sans IA — proportions égales entre tous les lots disponibles.',
    risks: ['Profil moins précis qu\'un calcul IA', 'Vérifier la cohérence organoleptique'],
    advantages: ['Calcul garanti sans dépendance IA', 'Simple à reproduire'],
    is_fallback: true,
  });

  // Scenario 2: Weighted by available volume (give more to lots with more volume)
  if (availableLots.length >= 2) {
    const volumeRatios = availableLots.map(lot => ({
      lot,
      ratio: Number(lot.current_volume_liters) / totalAvailable,
      volume_liters: Math.round((Number(lot.current_volume_liters) / totalAvailable) * targetVolume),
    }));
    const pred2 = calcWeightedAnalysis(volumeRatios.map(r => ({ lot: r.lot, ratio: r.ratio })));
    scenarios.push({
      id: 'scenario_2',
      name: 'Assemblage pondéré volumes',
      lots: volumeRatios.map(r => ({
        lot_id: r.lot.id,
        lot_number: r.lot.lot_number,
        percentage: Math.round(r.ratio * 100),
        volume_liters: r.volume_liters,
      })),
      predicted_analysis: pred2,
      quality_score: scoreAnalysis(pred2),
      profile: 'Assemblage reflétant les proportions naturelles des stocks disponibles.',
      reasoning: 'Proportions calculées selon les volumes disponibles de chaque lot.',
      risks: ['Dominance des lots les plus volumineux'],
      advantages: ['Optimise l\'utilisation des stocks', 'Réduit les résidus de lots'],
      is_fallback: true,
    });
  }

  // Scenario 3: First 2 lots at 60/40
  if (availableLots.length >= 2) {
    const ratios = [
      { lot: availableLots[0], ratio: 0.6, volume_liters: Math.round(targetVolume * 0.6) },
      { lot: availableLots[1], ratio: 0.4, volume_liters: Math.round(targetVolume * 0.4) },
    ];
    const pred3 = calcWeightedAnalysis(ratios.map(r => ({ lot: r.lot, ratio: r.ratio })));
    scenarios.push({
      id: 'scenario_3',
      name: 'Assemblage dominant (60/40)',
      lots: ratios.map(r => ({
        lot_id: r.lot.id,
        lot_number: r.lot.lot_number,
        percentage: r.ratio === 0.6 ? 60 : 40,
        volume_liters: r.volume_liters,
      })),
      predicted_analysis: pred3,
      quality_score: scoreAnalysis(pred3) - 5, // Slightly penalize less complex scenario
      profile: 'Assemblage à dominante avec lot principal, complété par apport de complexité.',
      reasoning: '60% du lot principal, 40% de complément — structure simple et lisible.',
      risks: ['Structure simple, moins de complexité', 'Gaspillage potentiel des autres lots'],
      advantages: ['Profil typique et maîtrisé', 'Facile à reproduire d\'une année à l\'autre'],
      is_fallback: true,
    });
  }

  return { scenarios, calculation_method: 'manual_weighted_fallback' };
}

// =============================================================================
// AI METRICS SCHEMA (to be added to schema.sql if not present)
// =============================================================================

export const AI_METRICS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS barbote_ai_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation VARCHAR(100) NOT NULL,
  success BOOLEAN NOT NULL,
  latency_ms INTEGER NOT NULL,
  attempt INTEGER DEFAULT 1,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_operation ON barbote_ai_metrics(operation, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_success ON barbote_ai_metrics(success, created_at DESC);
`;

export { openai };
