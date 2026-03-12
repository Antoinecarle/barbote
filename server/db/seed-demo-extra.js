// =============================================================================
// BARBOTE — SEED DÉMO EXTRA
// Complète les sections manquantes : Maintenance, AssemblageAI, Audit Log
// =============================================================================

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_PUBLIC_URL });

async function q(text, params = []) {
  const client = await pool.connect();
  try { return await client.query(text, params); }
  finally { client.release(); }
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

async function seed() {
  console.log('🔧 SEED DÉMO EXTRA — Maintenance + AssemblageAI + Audit Log\n');

  // -------------------------------------------------------
  // Récupère les IDs
  // -------------------------------------------------------
  const usersRes = await q(`SELECT id, email, role FROM barbote_users`);
  const adminUser = usersRes.rows.find(u => u.email === 'admin@chateau-marcelot.fr') ||
                    usersRes.rows.find(u => u.role === 'admin');
  const oenoUser  = usersRes.rows.find(u => u.role === 'oenologue') || adminUser;
  const op1User   = usersRes.rows.find(u => u.email?.includes('pierre')) || adminUser;
  const op2User   = usersRes.rows.find(u => u.email?.includes('claire')) || adminUser;

  const adminId = adminUser.id;
  const oenoId  = oenoUser.id;
  const op1Id   = op1User.id;
  const op2Id   = op2User.id;

  console.log(`Admin: ${adminUser.email}`);

  // Récupère les contenants
  const ctRes = await q(`SELECT id, code FROM barbote_containers ORDER BY code`);
  const containers = {};
  for (const c of ctRes.rows) containers[c.code] = c.id;

  // Récupère les lots
  const lotsRes = await q(`SELECT id, lot_number, name FROM barbote_lots`);
  const lots = {};
  for (const l of lotsRes.rows) lots[l.lot_number] = { id: l.id, name: l.name };

  // -------------------------------------------------------
  // 1. MAINTENANCE — 15 entrées supplémentaires
  // -------------------------------------------------------
  console.log('\n🔧 Ajout de 15 maintenances supplémentaires...');

  const maintenanceData = [
    // Nettoyages récents
    {
      container_id: containers['CI-01'],
      maintenance_type: 'cleaning',
      scheduled_date: daysAgo(5),
      completed_date: daysAgo(5),
      status: 'done',
      description: 'Nettoyage complet CI-01 après vidange Blend Classique 2023 — désinfection Divosan Forte',
      technician: 'Pierre Martin',
      cost: 180.00,
      notes: 'Surface intérieure RAS. Pas de tartre détecté. Rinçage 3 cycles eau chaude 80°C.',
      created_by: op1Id
    },
    {
      container_id: containers['FDR-01'],
      maintenance_type: 'cleaning',
      scheduled_date: daysAgo(12),
      completed_date: daysAgo(12),
      status: 'done',
      description: 'Détartrage foudre FDR-01 — dépôt tartrique important après 3 millésimes',
      technician: 'Équipe Cavex',
      cost: 650.00,
      notes: 'Détartrage acide tartrique 2% + rinçage. Poids tartre retiré : ~8 kg. Foudre comme neuf.',
      created_by: adminId
    },
    {
      container_id: containers['BAR-001'],
      maintenance_type: 'inspection',
      scheduled_date: daysAgo(8),
      completed_date: daysAgo(8),
      status: 'done',
      description: 'Inspection tonnellerie BAR-001 — vérification cerclage et méchage',
      technician: 'Tonnellerie Seguin Moreau',
      cost: 85.00,
      notes: 'Cerclage OK. Méchage soufre effectué. Barrique en parfait état. 2ème passage sur ce lot.',
      created_by: oenoId
    },
    {
      container_id: containers['BAR-002'],
      maintenance_type: 'inspection',
      scheduled_date: daysAgo(8),
      completed_date: daysAgo(8),
      status: 'done',
      description: 'Inspection tonnellerie BAR-002 — méchage soufre avant réutilisation',
      technician: 'Tonnellerie Seguin Moreau',
      cost: 85.00,
      notes: 'Légère odeur bois marquée. Rinçage supplémentaire recommandé. Note oenologue.',
      created_by: oenoId
    },
    // Réparations récentes
    {
      container_id: containers['CI-03'],
      maintenance_type: 'repair',
      scheduled_date: daysAgo(20),
      completed_date: daysAgo(19),
      status: 'done',
      description: 'Remplacement joint thermomètre CI-03 — fuite constatée lors inspection quotidienne',
      technician: 'Technicien Alfa Laval',
      cost: 120.00,
      notes: 'Joint EPDM alimentaire changé. Test étanchéité 24h OK. Remis en service.',
      created_by: op2Id
    },
    {
      container_id: containers['CB-02'],
      maintenance_type: 'repair',
      scheduled_date: daysAgo(35),
      completed_date: daysAgo(33),
      status: 'done',
      description: 'Réparation système thermorégulation cuve béton CB-02 — panne serpentin chaud',
      technician: 'INOFAD Maintenance',
      cost: 890.00,
      notes: 'Serpentin inox percé. Soudure TIG réalisée. Tests pression 4 bar. Conforme.',
      created_by: adminId
    },
    {
      container_id: containers['CI-05'],
      maintenance_type: 'repair',
      scheduled_date: daysAgo(60),
      completed_date: daysAgo(58),
      status: 'done',
      description: 'Remplacement pompe de soutirage station CI-05 — débit insuffisant',
      technician: 'Pompes Matrox Bordeaux',
      cost: 2450.00,
      notes: 'Pompe centrifuge alimentaire Inoxpa remplacée. Débit 15 m³/h → 22 m³/h. Garantie 2 ans.',
      created_by: adminId
    },
    // Calibrations
    {
      container_id: containers['CI-04'],
      maintenance_type: 'calibration',
      scheduled_date: daysAgo(15),
      completed_date: daysAgo(15),
      status: 'done',
      description: 'Calibration sonde pH CI-04 — dérive détectée +0.08 unité pH',
      technician: 'Pierre Martin',
      cost: 45.00,
      notes: 'Calibration 2 points pH 4.0 et 7.0. Dérive corrigée. Validation analyse comparative OK.',
      created_by: op1Id
    },
    {
      container_id: containers['CI-06'],
      maintenance_type: 'calibration',
      scheduled_date: daysAgo(3),
      completed_date: daysAgo(3),
      status: 'done',
      description: 'Calibration densimètre et réfractomètre cave — vérification étalonnage annuel',
      technician: 'Pierre Martin',
      cost: 60.00,
      notes: 'Étalons COFRAC utilisés. Densimètre: ±0.0001 OK. Réfractomètre: ±0.1°Brix OK.',
      created_by: op1Id
    },
    // Maintenances planifiées (futures)
    {
      container_id: containers['FDR-02'],
      maintenance_type: 'cleaning',
      scheduled_date: daysFromNow(7),
      completed_date: null,
      status: 'planned',
      description: 'Nettoyage foudre FDR-02 après embouteillage Grande Réserve 2022 prévu',
      technician: 'Équipe cave',
      cost: null,
      notes: 'Prévoir : solution TAP 2%, rinçage 3×, méchage soufre. Durée estimée 4h.',
      created_by: adminId
    },
    {
      container_id: containers['BAR-003'],
      maintenance_type: 'inspection',
      scheduled_date: daysFromNow(14),
      completed_date: null,
      status: 'planned',
      description: 'Inspection barriques élevage blanc BAR-003 — vérification après bâtonnage',
      technician: 'Sophie Duval',
      cost: null,
      notes: 'Contrôle: niveaux, ouillage, odeurs. Si anomalie: contact tonnelier.',
      created_by: oenoId
    },
    {
      container_id: containers['CI-01'],
      maintenance_type: 'inspection',
      scheduled_date: daysFromNow(21),
      completed_date: null,
      status: 'planned',
      description: 'Inspection annuelle cuves inox CI-01, CI-02 — vérification parois et agitateurs',
      technician: 'Cabinet Qualitec',
      cost: 380.00,
      notes: 'Inspection réglementaire HQE. Document de conformité exigé pour certification.',
      created_by: adminId
    },
    {
      container_id: containers['CIT-01'],
      maintenance_type: 'cleaning',
      scheduled_date: daysFromNow(3),
      completed_date: null,
      status: 'in_progress',
      description: 'Nettoyage citerne CIT-01 après départ Blend Classique — avant réception Sauvignon vrac',
      technician: 'Claire Blanc',
      cost: 220.00,
      notes: 'En cours. Rinçage phase 1 terminé. Phase désinfection peracétique demain matin.',
      created_by: op2Id
    },
    {
      container_id: containers['BAR-005'],
      maintenance_type: 'replacement',
      scheduled_date: daysFromNow(30),
      completed_date: null,
      status: 'planned',
      description: 'Remplacement barriques BAR-005, BAR-006 — fin de vie après 4 passages',
      technician: 'Tonnellerie Radoux',
      cost: 2800.00,
      notes: 'Devis Radoux 2025 reçu. 4 barriques 225L chêne allier grains fins. Livraison S12 2025.',
      created_by: adminId
    },
    {
      container_id: containers['CB-01'],
      maintenance_type: 'inspection',
      scheduled_date: daysAgo(45),
      completed_date: daysAgo(44),
      status: 'done',
      description: 'Inspection cuve béton CB-01 après Malbec essai — vérification porosité époxy',
      technician: 'Technicien Sonolco',
      cost: 150.00,
      notes: 'Revêtement époxy alimentaire RAS. Aucune micro-fissure. CB-01 autorisée 5 ans de plus.',
      created_by: adminId
    },
  ];

  let maintCount = 0;
  for (const m of maintenanceData) {
    try {
      await q(`
        INSERT INTO barbote_maintenance (
          container_id, maintenance_type, scheduled_date, completed_date,
          status, description, technician, cost, notes, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [
        m.container_id, m.maintenance_type, m.scheduled_date, m.completed_date,
        m.status, m.description, m.technician, m.cost, m.notes, m.created_by
      ]);
      maintCount++;
    } catch(e) {
      console.error(`  ⚠ Maintenance: ${e.message.slice(0, 80)}`);
    }
  }
  console.log(`  ✓ ${maintCount} maintenances créées`);

  // -------------------------------------------------------
  // 2. ASSEMBLAGE AI — 4 plans supplémentaires
  // -------------------------------------------------------
  console.log('\n🤖 Ajout de 4 plans assemblage IA...');

  const assemblageData = [
    {
      name: 'Réserve Signature 2025 — Plan assemblage préliminaire',
      target_volume: 12000,
      target_appellation: 'AOC Pauillac',
      target_vintage: 2025,
      target_analysis: {
        alcohol_percent: { min: 13.5, max: 14.5 },
        ph: { min: 3.55, max: 3.70 },
        total_acidity_gl: { min: 5.2, max: 6.0 },
        volatile_acidity_gl: { max: 0.50 },
        free_so2_mgl: { min: 28, max: 38 },
        total_so2_mgl: { max: 100 },
        quality_score_target: 93
      },
      constraints: {
        budget_euros_per_hl: 280,
        max_lots: 5,
        must_include: [],
        must_exclude: [],
        organic_preferred: false,
        min_cs_percent: 60
      },
      candidate_lots: [
        { lot_number: 'CS-2024-B02', lot_name: 'CS Vieilles Vignes 2024', variety: 'Cabernet Sauvignon', volume: 7800, quality_score: 89 },
        { lot_number: 'MRL-2024-B01', lot_name: 'Merlot Terroir 2024', variety: 'Merlot', volume: 14200, quality_score: 84.5 },
        { lot_number: 'PET-2024-B04', lot_name: 'Petit Verdot 2024', variety: 'Petit Verdot', volume: 3500, quality_score: 87 },
        { lot_number: 'CAB-2023-B07', lot_name: 'Cabernet Parcelle A 2023', variety: 'Cabernet Sauvignon', volume: 8600, quality_score: 88.5 },
        { lot_number: 'MER-2024-B03', lot_name: 'Merlot Bio 2024', variety: 'Merlot', volume: 6500, quality_score: 92 }
      ],
      scenarios: [
        {
          id: 'SC-A',
          name: 'Scénario Classique Pauillac',
          description: 'Assemblage traditionnel Médoc avec CS dominant',
          blend: [
            { lot_number: 'CS-2024-B02', percent: 65, volume: 7800 },
            { lot_number: 'MRL-2024-B01', percent: 22, volume: 2640 },
            { lot_number: 'PET-2024-B04', percent: 8, volume: 960 },
            { lot_number: 'MER-2024-B03', percent: 5, volume: 600 }
          ],
          predicted_analysis: { alcohol_percent: 13.8, ph: 3.55, total_acidity_gl: 6.1, volatile_acidity_gl: 0.38 },
          predicted_score: 91.5,
          ai_comment: 'Profil classique Pauillac. CS dominant apporte structure et garde. Petit Verdot renforce couleur et longueur. Bon équilibre tanin/fruit.'
        },
        {
          id: 'SC-B',
          name: 'Scénario Premium Expression',
          description: 'Mise en avant Merlot Bio pour rondeur et finesse',
          blend: [
            { lot_number: 'CS-2024-B02', percent: 55, volume: 6600 },
            { lot_number: 'MER-2024-B03', percent: 30, volume: 3600 },
            { lot_number: 'MRL-2024-B01', percent: 10, volume: 1200 },
            { lot_number: 'PET-2024-B04', percent: 5, volume: 600 }
          ],
          predicted_analysis: { alcohol_percent: 13.7, ph: 3.58, total_acidity_gl: 5.9, volatile_acidity_gl: 0.37 },
          predicted_score: 93.0,
          ai_comment: 'Score prédit supérieur grâce au Merlot Bio qui apporte finesse et complexité aromatique. Tanins plus soyeux. Recommandé pour positionnement haut de gamme.'
        },
        {
          id: 'SC-C',
          name: 'Scénario Volume Optimisé',
          description: 'Maximiser volume total avec qualité maintenue à 90+',
          blend: [
            { lot_number: 'MRL-2024-B01', percent: 50, volume: 6000 },
            { lot_number: 'CS-2024-B02', percent: 35, volume: 4200 },
            { lot_number: 'PET-2024-B04', percent: 10, volume: 1200 },
            { lot_number: 'MER-2024-B03', percent: 5, volume: 600 }
          ],
          predicted_analysis: { alcohol_percent: 13.5, ph: 3.52, total_acidity_gl: 6.0, volatile_acidity_gl: 0.41 },
          predicted_score: 90.0,
          ai_comment: 'Merlot majoritaire. Volume cible atteint. Score légèrement en retrait mais commercial viable pour entrée gamme Réserve.'
        }
      ],
      selected_scenario_id: 'SC-B',
      status: 'scenarios_ready',
      ai_model_used: 'gpt-5-mini-2025-08-07',
      notes: 'IA recommande Scénario B pour qualité maximale. Validation oenologue Sophie Duval requise avant exécution.',
    },
    {
      name: 'Cuvée Prestige Blanc 2024 — Assemblage Bordeaux Blanc',
      target_volume: 8000,
      target_appellation: 'AOC Pessac-Léognan',
      target_vintage: 2024,
      target_analysis: {
        alcohol_percent: { min: 12.5, max: 13.5 },
        ph: { min: 3.15, max: 3.30 },
        total_acidity_gl: { min: 7.0, max: 8.0 },
        residual_sugar_gl: { max: 4.0 }
      },
      constraints: {
        budget_euros_per_hl: 180,
        max_lots: 3,
        must_include: ['GRAV-2024-B10'],
        organic_preferred: false,
        barrel_aging_percent: 30
      },
      candidate_lots: [
        { lot_number: 'GRAV-2024-B10', lot_name: 'Graves Blanc 2024', variety: 'Sauvignon/Sémillon', volume: 11000, quality_score: 90 },
        { lot_number: 'SAU-2023-B12', lot_name: 'Sauvignon VV 2023', variety: 'Sauvignon Blanc', volume: 6500, quality_score: 88 },
        { lot_number: 'MUS-2024-B11', lot_name: 'Muscadelle Douce 2024', variety: 'Muscadelle', volume: 4000, quality_score: 83 }
      ],
      scenarios: [
        {
          id: 'SC-BLANC-A',
          name: 'Assemblage Pessac Traditionnel',
          description: 'Sauvignon/Sémillon avec pointe Muscadelle',
          blend: [
            { lot_number: 'GRAV-2024-B10', percent: 75, volume: 6000 },
            { lot_number: 'SAU-2023-B12', percent: 20, volume: 1600 },
            { lot_number: 'MUS-2024-B11', percent: 5, volume: 400 }
          ],
          predicted_analysis: { alcohol_percent: 13.0, ph: 3.19, total_acidity_gl: 7.5, residual_sugar_gl: 2.8 },
          predicted_score: 91.0,
          ai_comment: 'Profil Pessac-Léognan classique. Dominance Graves 2024 élevé barrique apporte minéralité et longueur. Muscadelle donne notes exotiques subtiles.'
        },
        {
          id: 'SC-BLANC-B',
          name: 'Expression Sauvignon Pure',
          description: 'Sauvignon dominant pour fraîcheur maximale',
          blend: [
            { lot_number: 'GRAV-2024-B10', percent: 55, volume: 4400 },
            { lot_number: 'SAU-2023-B12', percent: 45, volume: 3600 }
          ],
          predicted_analysis: { alcohol_percent: 12.9, ph: 3.20, total_acidity_gl: 7.6, residual_sugar_gl: 2.3 },
          predicted_score: 90.5,
          ai_comment: 'Plus de fraîcheur aromatique. Profil fruité-minéral. Adapté marché restauration et export UK.'
        }
      ],
      selected_scenario_id: null,
      status: 'scenarios_ready',
      ai_model_used: 'gpt-5-mini-2025-08-07',
      notes: 'En attente choix oenologue. Les 2 scénarios sont proches en qualité — décision commerciale (garde vs frais).',
    },
    {
      name: 'Bordeaux Entrée de Gamme 2024 — Assemblage Export',
      target_volume: 30000,
      target_appellation: 'AOC Bordeaux',
      target_vintage: 2024,
      target_analysis: {
        alcohol_percent: { min: 12.8, max: 13.8 },
        ph: { min: 3.45, max: 3.65 },
        total_acidity_gl: { min: 5.4, max: 6.2 },
        quality_score_target: 85
      },
      constraints: {
        budget_euros_per_hl: 85,
        max_lots: 6,
        must_include: [],
        target_market: 'export_usa_canada',
        oak_contact: false
      },
      candidate_lots: [
        { lot_number: 'MRL-2024-B01', lot_name: 'Merlot Terroir 2024', variety: 'Merlot', volume: 14200, quality_score: 84.5 },
        { lot_number: 'CS-2024-B02', lot_name: 'CS Vieilles Vignes 2024', variety: 'Cabernet Sauvignon', volume: 7800, quality_score: 89 },
        { lot_number: 'CAB-2023-B07', lot_name: 'Cabernet Parcelle A 2023', variety: 'Cabernet Sauvignon', volume: 8600, quality_score: 88.5 },
        { lot_number: 'MAL-2024-B16', lot_name: 'Malbec Essai 2024', variety: 'Malbec', volume: 2500, quality_score: null }
      ],
      scenarios: [
        {
          id: 'SC-EXPORT-A',
          name: 'Merlot Dominant Export',
          description: 'Profil fruité accessible pour marché américain',
          blend: [
            { lot_number: 'MRL-2024-B01', percent: 60, volume: 18000 },
            { lot_number: 'CS-2024-B02', percent: 25, volume: 7500 },
            { lot_number: 'CAB-2023-B07', percent: 12, volume: 3600 },
            { lot_number: 'MAL-2024-B16', percent: 3, volume: 900 }
          ],
          predicted_analysis: { alcohol_percent: 13.3, ph: 3.55, total_acidity_gl: 5.8, volatile_acidity_gl: 0.43 },
          predicted_score: 85.5,
          ai_comment: 'Profil rond et accessible. Merlot dominant apporte fruit rouge immédiat. Malbec en touche finale apporte couleur et originalité. Adapté USA/Canada.'
        }
      ],
      selected_scenario_id: 'SC-EXPORT-A',
      status: 'approved',
      ai_model_used: 'gpt-5-mini-2025-08-07',
      notes: 'Plan approuvé par Antoine Marcelot le 05/03/2025. Exécution prévue après fermentation MLF lot Merlot 2024.',
    },
    {
      name: 'Crémant de Bordeaux 2025 — Plan d\'assemblage brut',
      target_volume: 10000,
      target_appellation: 'AOC Crémant de Bordeaux',
      target_vintage: 2025,
      target_analysis: {
        alcohol_percent: { min: 11.0, max: 12.5 },
        ph: { min: 3.05, max: 3.20 },
        total_acidity_gl: { min: 7.5, max: 9.0 },
        dosage_gl: { min: 6, max: 12 }
      },
      constraints: {
        budget_euros_per_hl: 120,
        min_aging_months: 9,
        method: 'methode_traditionnelle',
        must_include: ['CREM-2024-B18']
      },
      candidate_lots: [
        { lot_number: 'CREM-2024-B18', lot_name: 'Crémant Blanc 2024', variety: 'Sémillon/Sauvignon/Muscadelle', volume: 8000, quality_score: 86 },
        { lot_number: 'GRAV-2024-B10', lot_name: 'Graves Blanc 2024 (réserve)', variety: 'Sauvignon/Sémillon', volume: 2000, quality_score: 90 }
      ],
      scenarios: [
        {
          id: 'SC-CREM-A',
          name: 'Crémant Classique 100% 2024',
          description: 'Mono-millésime CREM-2024-B18',
          blend: [
            { lot_number: 'CREM-2024-B18', percent: 100, volume: 10000 }
          ],
          predicted_analysis: { alcohol_percent: 11.5, ph: 3.08, total_acidity_gl: 8.2, dosage_gl: 10 },
          predicted_score: 86.0,
          ai_comment: 'Option simple et maîtrisée. Volume disponible suffisant. Acidité native adaptée au brut.'
        },
        {
          id: 'SC-CREM-B',
          name: 'Crémant Premium Assemblage',
          description: '20% Graves Blanc élevé barrique pour complexité',
          blend: [
            { lot_number: 'CREM-2024-B18', percent: 80, volume: 8000 },
            { lot_number: 'GRAV-2024-B10', percent: 20, volume: 2000 }
          ],
          predicted_analysis: { alcohol_percent: 12.0, ph: 3.12, total_acidity_gl: 7.8, dosage_gl: 8 },
          predicted_score: 88.5,
          ai_comment: 'L\'apport Graves Blanc élevé barrique ajoute rondeur et notes briochées. Score prédit supérieur. Idéal pour gamme premium Crémant Château Marcelot.'
        }
      ],
      selected_scenario_id: 'SC-CREM-B',
      status: 'draft',
      ai_model_used: 'gpt-5-mini-2025-08-07',
      notes: 'Plan en cours de finalisation. Lot Graves 2024 encore en élevage. Révision prévue avril 2025.',
    },
  ];

  let assCount = 0;
  for (const a of assemblageData) {
    try {
      await q(`
        INSERT INTO barbote_assemblage_plans (
          name, target_volume_liters, target_appellation, target_vintage_year,
          target_analysis, constraints, candidate_lots, scenarios,
          selected_scenario_id, status, ai_model_used, notes, created_by
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13)
      `, [
        a.name, a.target_volume, a.target_appellation, a.target_vintage,
        JSON.stringify(a.target_analysis), JSON.stringify(a.constraints),
        JSON.stringify(a.candidate_lots), JSON.stringify(a.scenarios),
        a.selected_scenario_id, a.status, a.ai_model_used, a.notes, adminId
      ]);
      assCount++;
    } catch(e) {
      console.error(`  ⚠ Assemblage "${a.name}": ${e.message.slice(0, 100)}`);
    }
  }
  console.log(`  ✓ ${assCount} plans assemblage créés`);

  // -------------------------------------------------------
  // 3. AUDIT LOG — 30 entrées d'activité système
  // -------------------------------------------------------
  console.log('\n📋 Ajout de 30 entrées audit log...');

  const lotIds = lotsRes.rows.slice(0, 10);

  const auditEntries = [
    // Connexions
    { table_name: 'barbote_sessions', record_id: adminId, action: 'INSERT', new_data: { email: 'admin@chateau-marcelot.fr', action: 'login', ip: '82.65.43.21' }, user_id: adminId, user_email: 'admin@chateau-marcelot.fr', ip: '82.65.43.21', created_at: daysAgo(0) },
    { table_name: 'barbote_sessions', record_id: oenoId, action: 'INSERT', new_data: { email: 'sophie.duval@chateau-marcelot.fr', action: 'login', ip: '82.65.43.21' }, user_id: oenoId, user_email: 'sophie.duval@chateau-marcelot.fr', ip: '82.65.43.21', created_at: daysAgo(0) },
    { table_name: 'barbote_sessions', record_id: op1Id, action: 'INSERT', new_data: { email: 'pierre.martin@chateau-marcelot.fr', action: 'login', ip: '82.65.43.22' }, user_id: op1Id, user_email: 'pierre.martin@chateau-marcelot.fr', ip: '82.65.43.22', created_at: daysAgo(1) },
    // Lots modifiés
    ...(lotIds.slice(0, 5).map((l, i) => ({
      table_name: 'barbote_lots',
      record_id: l.id,
      action: 'UPDATE',
      old_data: { status: 'active', current_volume_liters: 5000 + i * 1000 },
      new_data: { status: 'active', current_volume_liters: 4800 + i * 1000 },
      user_id: [adminId, oenoId, op1Id, op2Id][i % 4],
      user_email: ['admin@chateau-marcelot.fr', 'sophie.duval@chateau-marcelot.fr', 'pierre.martin@chateau-marcelot.fr', 'claire.blanc@chateau-marcelot.fr'][i % 4],
      ip: '82.65.43.21',
      created_at: daysAgo(i + 1)
    }))),
    // Analyses créées
    ...(lotIds.slice(0, 6).map((l, i) => ({
      table_name: 'barbote_analyses',
      record_id: l.id,
      action: 'INSERT',
      old_data: null,
      new_data: { lot_number: l.lot_number, analysis_type: ['quick', 'standard', 'complete'][i % 3] },
      user_id: [oenoId, op1Id, oenoId, op2Id][i % 4],
      user_email: ['sophie.duval@chateau-marcelot.fr', 'pierre.martin@chateau-marcelot.fr'][i % 2],
      ip: '82.65.43.21',
      created_at: daysAgo(i + 2)
    }))),
    // Mouvements créés
    ...(lotIds.slice(0, 6).map((l, i) => ({
      table_name: 'barbote_movements',
      record_id: l.id,
      action: 'INSERT',
      old_data: null,
      new_data: { lot_number: l.lot_number, movement_type: ['soutirage', 'transfert', 'sulfitage', 'filtration'][i % 4], volume: 5000 + i * 500 },
      user_id: [op1Id, op2Id, adminId][i % 3],
      user_email: ['pierre.martin@chateau-marcelot.fr', 'claire.blanc@chateau-marcelot.fr', 'admin@chateau-marcelot.fr'][i % 3],
      ip: '82.65.43.22',
      created_at: daysAgo(i + 3)
    }))),
    // Opérations validées
    ...(lotIds.slice(0, 4).map((l, i) => ({
      table_name: 'barbote_operations',
      record_id: l.id,
      action: 'UPDATE',
      old_data: { status: 'in_progress' },
      new_data: { status: 'done', actual_effect: 'Opération terminée conformément.' },
      user_id: oenoId,
      user_email: 'sophie.duval@chateau-marcelot.fr',
      ip: '82.65.43.21',
      created_at: daysAgo(i + 4)
    }))),
    // Assemblage plan créé
    { table_name: 'barbote_assemblage_plans', record_id: adminId, action: 'INSERT', new_data: { name: 'Réserve Signature 2025', status: 'draft' }, user_id: adminId, user_email: 'admin@chateau-marcelot.fr', ip: '82.65.43.21', created_at: daysAgo(5) },
    { table_name: 'barbote_assemblage_plans', record_id: adminId, action: 'UPDATE', old_data: { status: 'draft' }, new_data: { status: 'scenarios_ready' }, user_id: adminId, user_email: 'admin@chateau-marcelot.fr', ip: '82.65.43.21', created_at: daysAgo(3) },
    // Maintenance planifiée
    { table_name: 'barbote_maintenance', record_id: adminId, action: 'INSERT', new_data: { maintenance_type: 'cleaning', status: 'planned' }, user_id: adminId, user_email: 'admin@chateau-marcelot.fr', ip: '82.65.43.21', created_at: daysAgo(7) },
    { table_name: 'barbote_maintenance', record_id: op1Id, action: 'UPDATE', old_data: { status: 'planned' }, new_data: { status: 'done' }, user_id: op1Id, user_email: 'pierre.martin@chateau-marcelot.fr', ip: '82.65.43.22', created_at: daysAgo(5) },
    // Notifications lues
    { table_name: 'barbote_notifications', record_id: adminId, action: 'UPDATE', old_data: { read: false }, new_data: { read: true }, user_id: adminId, user_email: 'admin@chateau-marcelot.fr', ip: '82.65.43.21', created_at: daysAgo(2) },
    // Conversations IA
    { table_name: 'barbote_conversations', record_id: adminId, action: 'INSERT', new_data: { title: 'Grande Réserve 2022 — Stratégie commerciale', context_type: 'general' }, user_id: adminId, user_email: 'admin@chateau-marcelot.fr', ip: '82.65.43.21', created_at: daysAgo(4) },
    { table_name: 'barbote_messages', record_id: oenoId, action: 'INSERT', new_data: { role: 'user', tokens_used: 28 }, user_id: oenoId, user_email: 'sophie.duval@chateau-marcelot.fr', ip: '82.65.43.21', created_at: daysAgo(6) },
  ];

  let auditCount = 0;
  for (const entry of auditEntries) {
    try {
      await q(`
        INSERT INTO barbote_audit_log (
          table_name, record_id, action, old_data, new_data,
          user_id, user_email, ip_address, created_at
        ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9)
      `, [
        entry.table_name, entry.record_id, entry.action,
        entry.old_data ? JSON.stringify(entry.old_data) : null,
        entry.new_data ? JSON.stringify(entry.new_data) : null,
        entry.user_id, entry.user_email, entry.ip || '82.65.43.21',
        entry.created_at
      ]);
      auditCount++;
    } catch(e) {
      console.error(`  ⚠ Audit: ${e.message.slice(0, 80)}`);
    }
  }
  console.log(`  ✓ ${auditCount} entrées audit log créées`);

  // -------------------------------------------------------
  // RÉSUMÉ FINAL
  // -------------------------------------------------------
  const counts = await q(`
    SELECT
      (SELECT COUNT(*) FROM barbote_users)           AS users,
      (SELECT COUNT(*) FROM barbote_containers)       AS containers,
      (SELECT COUNT(*) FROM barbote_lots)             AS lots,
      (SELECT COUNT(*) FROM barbote_movements)        AS movements,
      (SELECT COUNT(*) FROM barbote_analyses)         AS analyses,
      (SELECT COUNT(*) FROM barbote_operations)       AS operations,
      (SELECT COUNT(*) FROM barbote_assemblage_plans) AS assemblage_plans,
      (SELECT COUNT(*) FROM barbote_maintenance)      AS maintenance,
      (SELECT COUNT(*) FROM barbote_conversations)    AS conversations,
      (SELECT COUNT(*) FROM barbote_messages)         AS messages,
      (SELECT COUNT(*) FROM barbote_notifications)    AS notifications,
      (SELECT COUNT(*) FROM barbote_audit_log)        AS audit_log
  `);

  const c = counts.rows[0];
  console.log('\n✅ SEED EXTRA terminé!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('  CHÂTEAU MARCELOT — Base démo complète');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  👤 Utilisateurs         : ${c.users}`);
  console.log(`  🛢️  Contenants           : ${c.containers}`);
  console.log(`  🍇 Lots de vin          : ${c.lots}`);
  console.log(`  🔄 Mouvements           : ${c.movements}`);
  console.log(`  🔬 Analyses             : ${c.analyses}`);
  console.log(`  ⚗️  Opérations           : ${c.operations}`);
  console.log(`  🤖 Plans assemblage     : ${c.assemblage_plans}`);
  console.log(`  🔧 Maintenances         : ${c.maintenance}`);
  console.log(`  💬 Conversations IA     : ${c.conversations} (${c.messages} msgs)`);
  console.log(`  🔔 Notifications        : ${c.notifications}`);
  console.log(`  📋 Audit log            : ${c.audit_log}`);
  console.log('═══════════════════════════════════════════════════');

  await pool.end();
}

seed().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
