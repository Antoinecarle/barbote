// =============================================================================
// BARBOTE - SEED DE DÉMONSTRATION
// Domaine Château Marcelot — Vignoble fictif du Bordelais
// =============================================================================

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_PUBLIC_URL });

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function seed() {
  console.log('🍷 Démarrage du seed Barbote — Château Marcelot...\n');

  // ============================================================
  // 1. UTILISATEURS
  // ============================================================
  console.log('👤 Création des utilisateurs...');

  const adminHash    = await bcrypt.hash('Admin2024!', 10);
  const oenoHash     = await bcrypt.hash('Oenologue2024!', 10);
  const opHash       = await bcrypt.hash('Operateur2024!', 10);
  const viewerHash   = await bcrypt.hash('Viewer2024!', 10);

  const usersResult = await query(`
    INSERT INTO barbote_users (email, password_hash, name, role, cellar_name)
    VALUES
      ('admin@chateau-marcelot.fr',    $1, 'Antoine Marcelot',    'admin',     'Château Marcelot'),
      ('sophie.duval@chateau-marcelot.fr', $2, 'Sophie Duval',    'oenologue', 'Château Marcelot'),
      ('pierre.martin@chateau-marcelot.fr', $3, 'Pierre Martin',  'operator',  'Château Marcelot'),
      ('claire.blanc@chateau-marcelot.fr',  $3, 'Claire Blanc',   'operator',  'Château Marcelot'),
      ('client@negoce-bordeaux.fr',     $4, 'Jean-Luc Renard',    'viewer',    NULL)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, email, name, role
  `, [adminHash, oenoHash, opHash, viewerHash]);

  const users = {};
  for (const u of usersResult.rows) {
    users[u.role === 'admin' ? 'admin' : u.email.split('@')[0].replace('.', '_')] = u.id;
    console.log(`  ✓ ${u.name} (${u.role})`);
  }
  // raccourcis
  const adminId   = usersResult.rows.find(u => u.role === 'admin').id;
  const oenoId    = usersResult.rows.find(u => u.role === 'oenologue').id;
  const op1Id     = usersResult.rows.find(u => u.name === 'Pierre Martin').id;
  const op2Id     = usersResult.rows.find(u => u.name === 'Claire Blanc').id;
  const viewerId  = usersResult.rows.find(u => u.role === 'viewer').id;

  // ============================================================
  // 2. CONTENANTS
  // ============================================================
  console.log('\n🛢️  Création des contenants...');

  const containersResult = await query(`
    INSERT INTO barbote_containers (code, name, type, capacity_liters, current_volume_liters, location, status, material, notes)
    VALUES
      -- Cuves inox
      ('CI-01', 'Cuve Inox 01', 'cuve_inox', 50000, 47800, 'Chai de vinification - Rangée A', 'in_use',   'Inox 304L', 'Cuve principale vinification rouge 2024'),
      ('CI-02', 'Cuve Inox 02', 'cuve_inox', 50000, 49200, 'Chai de vinification - Rangée A', 'in_use',   'Inox 304L', 'Merlot parcelle Les Graves 2024'),
      ('CI-03', 'Cuve Inox 03', 'cuve_inox', 30000, 28500, 'Chai de vinification - Rangée B', 'in_use',   'Inox 304L', 'Cabernet Sauvignon 2024'),
      ('CI-04', 'Cuve Inox 04', 'cuve_inox', 30000,     0, 'Chai de vinification - Rangée B', 'available','Inox 304L', 'Disponible'),
      ('CI-05', 'Cuve Inox 05', 'cuve_inox', 20000, 18900, 'Chai de vinification - Rangée C', 'in_use',   'Inox 304L', 'Sauvignon Blanc 2024'),
      ('CI-06', 'Cuve Inox 06', 'cuve_inox', 20000, 19400, 'Chai de vinification - Rangée C', 'in_use',   'Inox 316L', 'Sémillon 2024'),
      -- Cuves béton
      ('CB-01', 'Cuve Béton Œuf 01', 'cuve_beton', 12000, 11200, 'Chai historique', 'in_use', 'Béton', 'Cuve œuf — fermentation lente et naturelle'),
      ('CB-02', 'Cuve Béton Œuf 02', 'cuve_beton', 12000, 10800, 'Chai historique', 'in_use', 'Béton', 'Cuve œuf — Merlot prestige'),
      -- Barriques
      ('BAR-001', 'Barrique 001', 'barrique', 225, 220, 'Chai barriques - Rangée 1', 'in_use', 'Chêne français (Allier)', 'Nouvelle barrique - Merlot Grand Vin 2023'),
      ('BAR-002', 'Barrique 002', 'barrique', 225, 218, 'Chai barriques - Rangée 1', 'in_use', 'Chêne français (Allier)', 'Nouvelle barrique - Merlot Grand Vin 2023'),
      ('BAR-003', 'Barrique 003', 'barrique', 225, 221, 'Chai barriques - Rangée 1', 'in_use', 'Chêne américain (Missouri)', '2ème vin - Cabernet Franc 2023'),
      ('BAR-004', 'Barrique 004', 'barrique', 225, 215, 'Chai barriques - Rangée 1', 'in_use', 'Chêne français (Tronçais)', 'Barrique 1 passage - Assemblage Grand Vin'),
      ('BAR-005', 'Barrique 005', 'barrique', 225,   0, 'Chai barriques - Rangée 2', 'cleaning', 'Chêne français (Allier)', 'En cours de nettoyage après départ en bouteilles'),
      ('BAR-006', 'Barrique 006', 'barrique', 225, 223, 'Chai barriques - Rangée 2', 'in_use', 'Chêne français (Vosges)', 'Barrique 2 passages - Assemblage 2022'),
      -- Foudres
      ('FDR-01', 'Foudre Chêne 01', 'foudre', 5000, 4800, 'Cave voûtée', 'in_use', 'Chêne slovaque', 'Vieillissement long — Cabernet Sauvignon 2022'),
      ('FDR-02', 'Foudre Chêne 02', 'foudre', 5000, 4650, 'Cave voûtée', 'in_use', 'Chêne hongrois', 'Blanc de gastronomie 2023'),
      -- Citernes de stockage
      ('CIT-01', 'Citerne ISO 01', 'citerne', 100000, 85000, 'Chai de stockage extérieur', 'in_use', 'Inox alimentaire', 'Vrac - AOC Bordeaux générique 2023'),
      ('CIT-02', 'Citerne ISO 02', 'citerne',  80000,    0, 'Chai de stockage extérieur', 'available', 'Inox alimentaire', 'Disponible')
    ON CONFLICT (code) DO UPDATE SET current_volume_liters = EXCLUDED.current_volume_liters
    RETURNING id, code, name, type
  `);

  const containers = {};
  for (const c of containersResult.rows) {
    containers[c.code] = c.id;
    console.log(`  ✓ ${c.code} — ${c.name} (${c.type})`);
  }

  // ============================================================
  // 3. LOTS DE VIN
  // ============================================================
  console.log('\n🍇 Création des lots...');

  const lotsResult = await query(`
    INSERT INTO barbote_lots (
      lot_number, name, type, appellation, vintage_year,
      grape_varieties, initial_volume_liters, current_volume_liters,
      status, quality_score, harvest_date, analysis_matrix, notes, created_by
    ) VALUES
      -- ROUGES 2024 (nouvelle récolte, en cours de vinification)
      (
        'MRL-2024-01',
        'Merlot Les Graves 2024',
        'rouge', 'AOC Pomerol', 2024,
        '[{"variety":"Merlot","percentage":100}]',
        49200, 49200, 'active', 88.0,
        '2024-09-28',
        '{"alcohol_percent":13.2,"ph":3.55,"volatile_acidity_gl":0.38,"total_acidity_gl":5.8,"free_so2_mgl":22,"total_so2_mgl":65}',
        'Belle maturité phénolique. Robe rubis profond. Potentiel excellent pour le Grand Vin.',
        $1
      ),
      (
        'CS-2024-02',
        'Cabernet Sauvignon La Côte 2024',
        'rouge', 'AOC Pomerol', 2024,
        '[{"variety":"Cabernet Sauvignon","percentage":100}]',
        28500, 28500, 'active', 86.5,
        '2024-10-05',
        '{"alcohol_percent":13.8,"ph":3.41,"volatile_acidity_gl":0.41,"total_acidity_gl":6.2,"free_so2_mgl":18,"total_so2_mgl":55}',
        'Tanins fermes, bonne structure. Vieillissement 18 mois barriques prévu.',
        $1
      ),
      (
        'CF-2024-03',
        'Cabernet Franc Vieilles Vignes 2024',
        'rouge', 'AOC Saint-Émilion Grand Cru', 2024,
        '[{"variety":"Cabernet Franc","percentage":100}]',
        12000, 11200, 'active', 91.0,
        '2024-09-22',
        '{"alcohol_percent":13.5,"ph":3.48,"volatile_acidity_gl":0.32,"total_acidity_gl":5.9,"free_so2_mgl":25,"total_so2_mgl":58}',
        'Parcelle de 40 ans — Arômes floraux et épicés intenses. Lot d''exception.',
        $1
      ),
      -- BLANCS 2024
      (
        'SB-2024-04',
        'Sauvignon Blanc Prestige 2024',
        'blanc', 'AOC Bordeaux Blanc', 2024,
        '[{"variety":"Sauvignon Blanc","percentage":100}]',
        18900, 18900, 'active', 89.0,
        '2024-09-10',
        '{"alcohol_percent":12.8,"ph":3.25,"residual_sugar_gl":2.1,"total_acidity_gl":7.2,"free_so2_mgl":28,"total_so2_mgl":72,"malic_acid_gl":1.8}',
        'Vendange en légère surmaturité. Notes d''agrumes et fruits exotiques. FML non déclenchée.',
        $2
      ),
      (
        'SEM-2024-05',
        'Sémillon Vieil Or 2024',
        'blanc', 'AOC Bordeaux Blanc', 2024,
        '[{"variety":"Sémillon","percentage":100}]',
        19400, 19400, 'active', 85.5,
        '2024-09-18',
        '{"alcohol_percent":13.1,"ph":3.32,"residual_sugar_gl":1.8,"total_acidity_gl":6.8,"free_so2_mgl":24,"total_so2_mgl":68}',
        'Assemblage avec Sauvignon prévu. Élevage sur lies fines.',
        $2
      ),
      -- LOTS 2023 (en élevage)
      (
        'GV-2023-01',
        'Grand Vin Rouge 2023',
        'rouge', 'AOC Pomerol', 2023,
        '[{"variety":"Merlot","percentage":65},{"variety":"Cabernet Franc","percentage":25},{"variety":"Cabernet Sauvignon","percentage":10}]',
        18000, 17120, 'active', 94.5,
        '2023-09-30',
        '{"alcohol_percent":14.1,"ph":3.62,"volatile_acidity_gl":0.44,"total_acidity_gl":5.5,"free_so2_mgl":30,"total_so2_mgl":88,"color_intensity":1.42,"color_hue":0.71}',
        'Assemblage Grand Vin 2023. Élevage 18 mois barriques neuves et 1er passage. Mise en bouteilles prévue mars 2025.',
        $1
      ),
      (
        'DV-2023-02',
        'Deuxième Vin 2023',
        'rouge', 'AOC Bordeaux', 2023,
        '[{"variety":"Merlot","percentage":55},{"variety":"Cabernet Franc","percentage":30},{"variety":"Cabernet Sauvignon","percentage":15}]',
        22000, 20900, 'active', 87.0,
        '2023-10-02',
        '{"alcohol_percent":13.7,"ph":3.58,"volatile_acidity_gl":0.46,"total_acidity_gl":5.7,"free_so2_mgl":28,"total_so2_mgl":82}',
        'Deuxième vin du Château. Élevage foudres + cuves inox.',
        $1
      ),
      -- LOTS 2022 (prêts embouteillage)
      (
        'GV-2022-01',
        'Grand Vin Rouge 2022',
        'rouge', 'AOC Pomerol', 2022,
        '[{"variety":"Merlot","percentage":68},{"variety":"Cabernet Franc","percentage":22},{"variety":"Cabernet Sauvignon","percentage":10}]',
        16500, 14800, 'active', 96.0,
        '2022-09-20',
        '{"alcohol_percent":14.3,"ph":3.65,"volatile_acidity_gl":0.48,"total_acidity_gl":5.3,"free_so2_mgl":32,"total_so2_mgl":92,"color_intensity":1.55,"color_hue":0.69}',
        'Millésime exceptionnel. Prêt pour embouteillage T2 2025. Déjà classé 96/100 par le consultant.',
        $1
      ),
      -- LOT VENDU
      (
        'BDX-2021-VRAC',
        'Bordeaux Générique 2023',
        'rouge', 'AOC Bordeaux', 2023,
        '[{"variety":"Merlot","percentage":70},{"variety":"Cabernet Sauvignon","percentage":30}]',
        100000, 85000, 'active', 82.0,
        '2023-10-10',
        '{"alcohol_percent":13.0,"ph":3.52,"volatile_acidity_gl":0.52,"total_acidity_gl":5.9,"free_so2_mgl":20,"total_so2_mgl":75}',
        'Lot vrac AOC Bordeaux. Stockage citerne. Vente négoce.',
        $1
      )
    ON CONFLICT (lot_number) DO UPDATE SET current_volume_liters = EXCLUDED.current_volume_liters
    RETURNING id, lot_number, name, type, status
  `, [adminId, oenoId]);

  const lots = {};
  for (const l of lotsResult.rows) {
    lots[l.lot_number] = l.id;
    console.log(`  ✓ [${l.lot_number}] ${l.name}`);
  }

  // ============================================================
  // 4. ASSOCIATIONS LOT → CONTENANT
  // ============================================================
  console.log('\n🔗 Association lots → contenants...');

  await query(`
    INSERT INTO barbote_lot_containers (lot_id, container_id, volume_liters, filling_date, is_current)
    VALUES
      ($1,  $10, 49200, '2024-10-06', true),   -- Merlot 2024 → CI-02
      ($2,  $11, 28500, '2024-10-12', true),   -- CS 2024 → CI-03
      ($3,  $14, 10800, '2024-09-24', true),   -- CF 2024 → CB-02 (partie)
      ($3,  $12, 400,  '2024-09-24', true),    -- CF 2024 → BAR-001+002 (4 barriques)
      ($4,  $13, 18900, '2024-09-12', true),   -- SB 2024 → CI-05
      ($5,  $15, 19400, '2024-09-20', true),   -- SEM 2024 → CI-06
      ($6,  $16, 4080, '2024-03-15', true),    -- GV 2023 → BAR-001..004 (lot réparti, on simplifie)
      ($7,  $17, 20900, '2024-01-10', true),   -- DV 2023 → FDR-01 (partie)
      ($8,  $18, 14800, '2022-10-20', true),   -- GV 2022 → FDR-01 partie
      ($9,  $19, 85000, '2023-11-05', true)    -- BDX vrac → CIT-01
    ON CONFLICT DO NOTHING
  `, [
    lots['MRL-2024-01'], lots['CS-2024-02'], lots['CF-2024-03'],
    lots['SB-2024-04'], lots['SEM-2024-05'], lots['GV-2023-01'],
    lots['DV-2023-02'], lots['GV-2022-01'], lots['BDX-2021-VRAC'],
    containers['CI-02'], containers['CI-03'], containers['CB-02'],
    containers['BAR-001'], containers['CI-05'], containers['CI-06'],
    containers['BAR-004'], containers['FDR-01'], containers['FDR-02'],
    containers['CIT-01']
  ]);
  console.log('  ✓ Associations créées');

  // ============================================================
  // 5. INTRANTS (PRODUITS OENOLOGIQUES)
  // ============================================================
  console.log('\n🧪 Création des intrants...');

  await query(`
    INSERT INTO barbote_inputs (name, category, brand, batch_number, quantity, unit, expiry_date, max_dose_per_hl)
    VALUES
      ('Métabisulfite de potassium (SO2)', 'so2',     'Oenobrands',  'SO2-2024-001', 25.0,  'kg',  '2026-01-01', 10.0),
      ('SO2 liquide 6%',                  'so2',     'Laffort',     'SO2L-2024-003', 50.0,  'L',   '2025-06-30',  8.0),
      ('Levures EC1118',                  'levure',  'Lallemand',   'LEV-2024-012',  5.0,   'kg',  '2025-12-31', 20.0),
      ('Levures BM45 (arômes)',           'levure',  'Lallemand',   'LEV-2024-018',  2.5,   'kg',  '2025-12-31', 20.0),
      ('Bactéries lactiques Lactoenos',   'bacterie','Oenobrands',  'BAC-2024-005',  1.0,   'kg',  '2025-09-30',  5.0),
      ('Bentonite sodique',               'bentonite','Laffort',    'BEN-2024-007', 40.0,   'kg',  '2026-12-31', 100.0),
      ('Gélatine alimentaire',            'colle',   'Rousselot',   'GEL-2024-003', 10.0,   'kg',  '2025-06-30',  5.0),
      ('Tanins de chêne',                 'tannin',  'ETS Boisé FR','TAN-2024-009',  8.0,   'kg',  '2026-06-30', 20.0),
      ('Acide tartrique',                 'acide',   'Univins',     'ACI-2024-002', 15.0,   'kg',  '2027-01-01', 150.0),
      ('Pectinase enzymatique',           'enzyme',  'DSM',         'ENZ-2024-004',  1.5,   'kg',  '2025-03-31',  3.0),
      ('Sucre de betterave (chaptal.)',    'sucre',   'Cristal Union','SUC-2024-001', 200.0, 'kg',  '2025-12-31', 340.0),
      ('Charbon oenologique décolorant',  'charbon', 'Laffort',     'CHA-2024-001',  5.0,   'kg',  '2026-01-01', 100.0)
    ON CONFLICT DO NOTHING
  `);
  console.log('  ✓ 12 intrants oenologiques créés');

  // ============================================================
  // 6. MOUVEMENTS
  // ============================================================
  console.log('\n🔄 Création des mouvements...');

  // Entrées vendange 2024 — une par une pour éviter les conflits de paramètres
  const movementsToInsert = [
    // Entrées
    { movement_type:'entree', lot_id:lots['MRL-2024-01'], from_container_id:null, to_container_id:containers['CI-02'],
      volume_liters:49200, date:'2024-10-06 08:30:00', operator_id:op1Id, volume_loss_liters:0,
      inputs:'[]', source_lots:'[]', target_lot_id:null,
      reason:'Entrée vendange Merlot parcelle Les Graves',
      notes:'Densité entrée : 1.085. Température : 18°C. Levurage EC1118 effectué.',
      validated:true, validated_by:oenoId, validated_at:'2024-10-06 18:00:00', created_by:op1Id },
    { movement_type:'entree', lot_id:lots['CS-2024-02'], from_container_id:null, to_container_id:containers['CI-03'],
      volume_liters:28500, date:'2024-10-12 07:45:00', operator_id:op1Id, volume_loss_liters:0,
      inputs:'[]', source_lots:'[]', target_lot_id:null,
      reason:'Entrée vendange Cabernet Sauvignon La Côte',
      notes:'Densité entrée : 1.091. Chaptalisation +12g/L sucre prévue.',
      validated:true, validated_by:oenoId, validated_at:'2024-10-12 19:00:00', created_by:op1Id },
    { movement_type:'entree', lot_id:lots['CF-2024-03'], from_container_id:null, to_container_id:containers['CB-02'],
      volume_liters:12000, date:'2024-09-24 06:00:00', operator_id:op2Id, volume_loss_liters:0,
      inputs:'[]', source_lots:'[]', target_lot_id:null,
      reason:'Entrée vendange Cabernet Franc VV — pressoir pneumatique',
      notes:'Tri optique effectué. 3% refus. Raisin parfait.',
      validated:true, validated_by:oenoId, validated_at:'2024-09-24 20:00:00', created_by:op2Id },
    { movement_type:'entree', lot_id:lots['SB-2024-04'], from_container_id:null, to_container_id:containers['CI-05'],
      volume_liters:18900, date:'2024-09-10 05:30:00', operator_id:op2Id, volume_loss_liters:0,
      inputs:'[]', source_lots:'[]', target_lot_id:null,
      reason:'Vendange blanche — Sauvignon Blanc prestige',
      notes:'Récolte nocturne. T° raisin : 14°C. Sulfitage 5g/hL à réception.',
      validated:true, validated_by:oenoId, validated_at:'2024-09-10 12:00:00', created_by:op2Id },
    // Soutirages
    { movement_type:'soutirage', lot_id:lots['GV-2023-01'], from_container_id:containers['CI-01'], to_container_id:containers['BAR-004'],
      volume_liters:17120, date:'2024-03-15 09:00:00', operator_id:op1Id, volume_loss_liters:880,
      inputs:'[]', source_lots:'[]', target_lot_id:null,
      reason:'Premier soutirage Grand Vin 2023 — débourbage fin',
      notes:'Lies fines récupérées. Analyse post-soutirage OK. Transfert vers barriques neuves.',
      validated:true, validated_by:oenoId, validated_at:'2024-03-15 17:00:00', created_by:op1Id },
    { movement_type:'soutirage', lot_id:lots['DV-2023-02'], from_container_id:containers['CI-04'], to_container_id:containers['FDR-01'],
      volume_liters:20900, date:'2024-01-10 08:00:00', operator_id:op1Id, volume_loss_liters:1100,
      inputs:'[]', source_lots:'[]', target_lot_id:null,
      reason:'Soutirage Deuxième Vin 2023 — mise en foudre',
      notes:'Analyses conformes. Sulfitage 2g/hL. Volume pertes lies et marc.',
      validated:true, validated_by:oenoId, validated_at:'2024-01-10 16:00:00', created_by:op1Id },
    // Sulfitages
    { movement_type:'sulfitage', lot_id:lots['MRL-2024-01'], from_container_id:null, to_container_id:containers['CI-02'],
      volume_liters:49200, date:'2024-10-06 09:00:00', operator_id:op1Id, volume_loss_liters:0,
      inputs:'[{"product":"Métabisulfite de potassium","quantity":24.6,"unit":"g","dose_per_hl":5}]',
      source_lots:'[]', target_lot_id:null,
      reason:'Sulfitage pré-fermentaire Merlot 2024',
      notes:'SO2 libre cible : 30 mg/L. Ajout progressif sous agitation.',
      validated:true, validated_by:oenoId, validated_at:'2024-10-06 10:00:00', created_by:op1Id },
    { movement_type:'sulfitage', lot_id:lots['CS-2024-02'], from_container_id:null, to_container_id:containers['CI-03'],
      volume_liters:28500, date:'2024-10-12 08:00:00', operator_id:op1Id, volume_loss_liters:0,
      inputs:'[{"product":"SO2 liquide 6%","quantity":19.0,"unit":"g","dose_per_hl":6.7}]',
      source_lots:'[]', target_lot_id:null,
      reason:'Sulfitage pré-fermentaire CS 2024',
      notes:'Raisin sain, dose modérée.',
      validated:true, validated_by:oenoId, validated_at:'2024-10-12 09:00:00', created_by:op1Id },
    { movement_type:'sulfitage', lot_id:lots['BDX-2021-VRAC'], from_container_id:null, to_container_id:containers['CIT-01'],
      volume_liters:85000, date:'2023-11-15 10:00:00', operator_id:op1Id, volume_loss_liters:0,
      inputs:'[{"product":"Métabisulfite de potassium","quantity":85.0,"unit":"g","dose_per_hl":10}]',
      source_lots:'[]', target_lot_id:null,
      reason:'Sulfitage post-FML lot vrac avant stockage citerne',
      notes:'Dose réglementaire max. SO2 total < 150 mg/L.',
      validated:true, validated_by:oenoId, validated_at:'2023-11-15 18:00:00', created_by:op1Id },
    // Assemblage
    { movement_type:'assemblage', lot_id:null, from_container_id:null, to_container_id:null,
      volume_liters:18000, date:'2024-02-01 10:00:00', operator_id:oenoId, volume_loss_liters:0,
      inputs:'[]',
      source_lots:`[{"lot_id":"${lots['MRL-2024-01']}","volume":11700,"percentage":65},{"lot_id":"${lots['CF-2024-03']}","volume":4500,"percentage":25},{"lot_id":"${lots['CS-2024-02']}","volume":1800,"percentage":10}]`,
      target_lot_id:lots['GV-2023-01'],
      reason:'Assemblage Grand Vin 2023 — validation oenologue',
      notes:'Essais assemblage réalisés en janvier. Option 3 retenue (94.5 pts consultant).',
      validated:true, validated_by:oenoId, validated_at:'2024-02-01 18:00:00', created_by:adminId },
  ];

  for (const m of movementsToInsert) {
    await query(`
      INSERT INTO barbote_movements (
        movement_type, lot_id, from_container_id, to_container_id, volume_liters, date,
        operator_id, volume_loss_liters, inputs, source_lots, target_lot_id,
        reason, notes, validated, validated_by, validated_at, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,$16,$17)
    `, [
      m.movement_type, m.lot_id, m.from_container_id, m.to_container_id,
      m.volume_liters, m.date, m.operator_id, m.volume_loss_liters,
      m.inputs, m.source_lots, m.target_lot_id,
      m.reason, m.notes, m.validated, m.validated_by, m.validated_at, m.created_by
    ]);
  }

  console.log(`  ✓ ${movementsToInsert.length} mouvements créés (entrées, soutirages, sulfitages, assemblage)`);

  // ============================================================
  // 7. ANALYSES (insertions individuelles)
  // ============================================================
  console.log('\n🔬 Création des analyses...');

  // Helper: insère une analyse avec tous ses champs
  async function insertAnalyse(a) {
    await query(`
      INSERT INTO barbote_analyses (
        lot_id, container_id, analysis_date, analysis_type, lab_name,
        alcohol_percent, residual_sugar_gl, total_acidity_gl, volatile_acidity_gl,
        ph, free_so2_mgl, total_so2_mgl, malic_acid_gl, lactic_acid_gl,
        tartaric_acid_gl, color_intensity, color_hue, turbidity_ntu, temperature_c,
        density, comments, is_validated, validated_by, created_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      )
    `, [
      a.lot_id, a.container_id, a.date, a.type, a.lab,
      a.alcohol, a.residual_sugar, a.total_acidity, a.volatile_acidity,
      a.ph, a.free_so2, a.total_so2, a.malic_acid, a.lactic_acid,
      a.tartaric_acid, a.color_intensity, a.color_hue, a.turbidity, a.temperature,
      a.density, a.comments, a.validated, a.validated_by, a.created_by
    ]);
  }

  const analyses = [
    { lot_id: lots['MRL-2024-01'], container_id: containers['CI-02'], date: '2024-10-07 08:00:00',
      type: 'quick', lab: null, alcohol: 0, residual_sugar: null, total_acidity: 6.8, volatile_acidity: 0.28,
      ph: 3.44, free_so2: 18, total_so2: 45, malic_acid: 5.2, lactic_acid: 0, tartaric_acid: 4.1,
      color_intensity: 1.82, color_hue: 0.88, turbidity: 4.2, temperature: 22.0, density: 1.0845,
      comments: 'Début fermentation — levures EC1118 actives. Densité en baisse.',
      validated: true, validated_by: oenoId, created_by: oenoId },
    { lot_id: lots['MRL-2024-01'], container_id: containers['CI-02'], date: '2024-10-12 08:00:00',
      type: 'quick', lab: null, alcohol: 8.5, residual_sugar: 45.0, total_acidity: 6.2, volatile_acidity: 0.31,
      ph: 3.51, free_so2: 12, total_so2: 52, malic_acid: 4.1, lactic_acid: 0, tartaric_acid: 3.8,
      color_intensity: 1.95, color_hue: 0.82, turbidity: 3.1, temperature: 24.0, density: 1.0445,
      comments: 'Mi-fermentation. Chapeaux pigeonnés 3×/jour. Extraction couleur excellente.',
      validated: true, validated_by: oenoId, created_by: oenoId },
    { lot_id: lots['MRL-2024-01'], container_id: containers['CI-02'], date: '2024-10-20 10:00:00',
      type: 'standard', lab: null, alcohol: 13.2, residual_sugar: 1.8, total_acidity: 5.8, volatile_acidity: 0.38,
      ph: 3.55, free_so2: 22, total_so2: 65, malic_acid: 2.1, lactic_acid: 0.8, tartaric_acid: 3.2,
      color_intensity: 1.71, color_hue: 0.78, turbidity: 1.8, temperature: 18.0, density: 0.9948,
      comments: 'Fin fermentation alcoolique. FML en cours (acide malique résiduel 2.1 g/L). Profil aromatique : cerise noire, cassis.',
      validated: true, validated_by: oenoId, created_by: oenoId },
    { lot_id: lots['GV-2023-01'], container_id: containers['BAR-004'], date: '2024-09-15 09:00:00',
      type: 'complete', lab: 'Laboratoire Dubernet — Narbonne', alcohol: 14.1, residual_sugar: 0.9,
      total_acidity: 5.5, volatile_acidity: 0.44, ph: 3.62, free_so2: 30, total_so2: 88,
      malic_acid: 0, lactic_acid: 1.8, tartaric_acid: 2.9, color_intensity: 1.42, color_hue: 0.71,
      turbidity: 0.8, temperature: 15.5, density: 0.9912,
      comments: 'Analyse complète pré-assemblage. FML totalement terminée. Malic acide nul. Bonne intégration tannique. Prêt embouteillage après soutirage final.',
      validated: true, validated_by: oenoId, created_by: oenoId },
    { lot_id: lots['GV-2022-01'], container_id: containers['FDR-02'], date: '2024-11-20 10:00:00',
      type: 'complete', lab: 'Laboratoire Oenolab Bordeaux', alcohol: 14.3, residual_sugar: 0.6,
      total_acidity: 5.3, volatile_acidity: 0.48, ph: 3.65, free_so2: 32, total_so2: 92,
      malic_acid: 0, lactic_acid: 2.1, tartaric_acid: 2.7, color_intensity: 1.55, color_hue: 0.69,
      turbidity: 0.5, temperature: 14.0, density: 0.9905,
      comments: 'Contrôle avant embouteillage T2 2025. Tout est dans les normes. SO2 à surveiller avant mise.',
      validated: true, validated_by: oenoId, created_by: adminId },
    { lot_id: lots['SB-2024-04'], container_id: containers['CI-05'], date: '2024-09-11 08:00:00',
      type: 'quick', lab: null, alcohol: 0, residual_sugar: null, total_acidity: 8.1, volatile_acidity: 0.22,
      ph: 3.18, free_so2: 25, total_so2: 40, malic_acid: 3.8, lactic_acid: 0, tartaric_acid: 5.2,
      color_intensity: null, color_hue: null, turbidity: 8.5, temperature: 12.5, density: 1.0782,
      comments: 'Analyse à réception. Raisin frais, bonne acidité. Débourbage en cours 12h à 8°C.',
      validated: true, validated_by: oenoId, created_by: oenoId },
    { lot_id: lots['SB-2024-04'], container_id: containers['CI-05'], date: '2024-09-25 09:00:00',
      type: 'standard', lab: null, alcohol: 12.8, residual_sugar: 2.1, total_acidity: 7.2, volatile_acidity: 0.28,
      ph: 3.25, free_so2: 28, total_so2: 72, malic_acid: 1.8, lactic_acid: 0, tartaric_acid: 4.1,
      color_intensity: null, color_hue: null, turbidity: 1.2, temperature: 16.0, density: 0.9934,
      comments: 'Fin fermentation alcoolique. Profil variétal parfait : buis, citron, fruits de la passion. FML bloquée volontairement.',
      validated: true, validated_by: oenoId, created_by: adminId },
  ];

  for (const a of analyses) await insertAnalyse(a);
  console.log(`  ✓ ${analyses.length} analyses créées`);

  // ============================================================
  // 8. OPÉRATIONS (insertions individuelles)
  // ============================================================
  console.log('\n⚗️  Création des opérations...');

  const operations = [
    { type: 'levurage', lot_id: lots['MRL-2024-01'], container_id: containers['CI-02'],
      date: '2024-10-06 10:00:00', dose: 15.0, volume: 49200, temp: 18.0,
      products: '[{"name":"Levures EC1118","quantity":0.74,"unit":"kg","batch_number":"LEV-2024-012"}]',
      purpose: 'Inoculation levures sélectionnées pour départ fermentation maîtrisé',
      expected: 'Fermentation démarrée sous 24-48h, profil aromatique fruité',
      actual: 'Fermentation démarrée dans les 18h. Résultat conforme.',
      operator_id: op1Id, status: 'done',
      notes: 'Réhydratation levures 30 min dans eau 37°C + acclimatation progressive.' },
    { type: 'levurage', lot_id: lots['CS-2024-02'], container_id: containers['CI-03'],
      date: '2024-10-12 09:30:00', dose: 15.0, volume: 28500, temp: 17.5,
      products: '[{"name":"Levures BM45 (arômes)","quantity":0.43,"unit":"kg","batch_number":"LEV-2024-018"}]',
      purpose: 'Levurage Cabernet Sauvignon — optimisation profil aromatique',
      expected: 'Fermentation lente et aromatique, conservation thiols',
      actual: 'Fermentation démarrée à 36h. Notes poivron vert réduites comme prévu.',
      operator_id: op1Id, status: 'done', notes: null },
    { type: 'collage', lot_id: lots['GV-2023-01'], container_id: containers['BAR-004'],
      date: '2024-09-30 14:00:00', dose: 60.0, volume: 20000, temp: 16.0,
      products: '[{"name":"Bentonite sodique","quantity":1.20,"unit":"kg","batch_number":"BEN-2024-007"}]',
      purpose: 'Collage protéique GV 2023 avant embouteillage — stabilisation tartrique',
      expected: 'Élimination protéines instables, réduction risque casse protéique',
      actual: 'Test de chaleur post-collage négatif. Objectif atteint.',
      operator_id: op2Id, status: 'done',
      notes: 'Test de chaleur préalable : instabilité protéique détectée. Dose collage calculée selon protocole.' },
    { type: 'filtration', lot_id: lots['GV-2023-01'], container_id: containers['BAR-004'],
      date: '2024-10-10 08:00:00', dose: null, volume: 18000, temp: 14.0,
      products: '[{"name":"Plaques filtrantes KSEK 15","quantity":50.0,"unit":"plaques","batch_number":"FIL-2024-001"}]',
      purpose: 'Filtration finale GV 2023 avant mise en bouteilles',
      expected: 'Clarification < 1 NTU, stérilité contrôlée',
      actual: 'Turbidité finale : 0.5 NTU. Filtration réussie.',
      operator_id: op2Id, status: 'done',
      notes: 'Filtration sur plaques épaississantes puis finissantes en série.' },
    { type: 'sulfitage', lot_id: lots['GV-2022-01'], container_id: containers['FDR-01'],
      date: '2024-11-01 10:00:00', dose: 5.0, volume: 17000, temp: 15.0,
      products: '[{"name":"SO2 liquide 6%","quantity":8.5,"unit":"g","dose_per_hl":5}]',
      purpose: 'Remise à niveau SO2 libre GV 2022 avant embouteillage',
      expected: 'SO2 libre cible : 35 mg/L, SO2 total < 100 mg/L',
      actual: null, operator_id: op1Id, status: 'planned',
      notes: 'À effectuer T1 2025. Analyse de contrôle post-sulfitage obligatoire.' },
    { type: 'malo', lot_id: lots['MRL-2024-01'], container_id: containers['CI-02'],
      date: '2024-11-15 00:00:00', dose: 7.5, volume: 49200, temp: 20.0,
      products: '[{"name":"Bactéries lactiques Lactoenos","quantity":0.37,"unit":"kg","batch_number":"BAC-2024-005"}]',
      purpose: 'Déclenchement fermentation malolactique Merlot 2024',
      expected: 'Dégradation acide malique → acide lactique, assouplissement des vins',
      actual: 'FML démarrée. Suivi chromatographie papier hebdomadaire.',
      operator_id: oenoId, status: 'in_progress',
      notes: 'Température cave maintenue à 20°C pour favoriser FML.' },
  ];

  for (const op of operations) {
    await query(`
      INSERT INTO barbote_operations (
        operation_type, lot_id, container_id, date,
        products_used, dose_per_hl, volume_treated_liters, temperature_c,
        purpose, expected_effect, actual_effect, operator_id, status, notes
      ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `, [op.type, op.lot_id, op.container_id, op.date,
        op.products, op.dose, op.volume, op.temp,
        op.purpose, op.expected, op.actual, op.operator_id, op.status, op.notes]);
  }
  console.log(`  ✓ ${operations.length} opérations créées`);

  // ============================================================
  // 9. PLAN D'ASSEMBLAGE AI
  // ============================================================
  console.log('\n🤖 Création d\'un plan d\'assemblage AI...');

  const lotMRL = lots['MRL-2024-01'];
  const lotCF  = lots['CF-2024-03'];
  const lotCS  = lots['CS-2024-02'];

  await query(`
    INSERT INTO barbote_assemblage_plans (
      name, target_volume_liters, target_appellation, target_vintage_year,
      target_analysis, constraints, candidate_lots, scenarios,
      selected_scenario_id, status, ai_model_used, notes, created_by
    ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13)
    ON CONFLICT DO NOTHING
  `, [
    'Assemblage Grand Vin 2024 — Plan préliminaire', 20000, 'AOC Pomerol', 2024,
    '{"alcohol_percent":{"min":13.5,"max":14.5},"ph":{"min":3.5,"max":3.7},"volatile_acidity_gl":{"max":0.5},"free_so2_mgl":{"min":25,"max":40}}',
    JSON.stringify({ min_merlot_percent: 60, max_cs_percent: 20, organic_only: false, volume_must_use: { [lotMRL]: { min: 12000 } } }),
    JSON.stringify([
      { lot_id: lotMRL, name: 'Merlot Les Graves 2024', volume_available: 49200 },
      { lot_id: lotCF, name: 'Cabernet Franc VV 2024', volume_available: 11200 },
      { lot_id: lotCS, name: 'CS La Côte 2024', volume_available: 28500 }
    ]),
    JSON.stringify([
      { id: 'scenario_1', name: 'Option classique',
        lots: [{ lot_id: lotMRL, percentage: 65, volume: 13000 }, { lot_id: lotCF, percentage: 25, volume: 5000 }, { lot_id: lotCS, percentage: 10, volume: 2000 }],
        predicted_analysis: { alcohol_percent: 13.5, ph: 3.52, volatile_acidity_gl: 0.37 }, score: 91.2,
        reasoning: 'Assemblage traditionnel du Château. Merlot dominant apporte rondeur et fruité immédiat. Cabernet Franc ajoute complexité florale. Potentiel garde 12-15 ans.' },
      { id: 'scenario_2', name: 'Option Cabernet Franc premium',
        lots: [{ lot_id: lotMRL, percentage: 55, volume: 11000 }, { lot_id: lotCF, percentage: 35, volume: 7000 }, { lot_id: lotCS, percentage: 10, volume: 2000 }],
        predicted_analysis: { alcohol_percent: 13.4, ph: 3.50, volatile_acidity_gl: 0.35 }, score: 93.5,
        reasoning: 'Plus grande présence Cabernet Franc des Vieilles Vignes (40 ans). Profil unique, plus tendu et minéral. Recommandé si objectif médailles internationales.' },
      { id: 'scenario_3', name: 'Option puissance',
        lots: [{ lot_id: lotMRL, percentage: 60, volume: 12000 }, { lot_id: lotCS, percentage: 30, volume: 6000 }, { lot_id: lotCF, percentage: 10, volume: 2000 }],
        predicted_analysis: { alcohol_percent: 13.6, ph: 3.54, volatile_acidity_gl: 0.39 }, score: 88.0,
        reasoning: 'Plus de Cabernet Sauvignon pour structure et tanins. Vieillissement plus long nécessaire (15-20 ans). Marché asiatique potentiel.' }
    ]),
    'scenario_2', 'scenarios_ready', 'gpt-5-mini-2025-08-07',
    'Scénario 2 recommandé par IA et validé par Sophie Duval (oenologue). Réunion de dégustation planifiée décembre 2024.',
    adminId
  ]);
  console.log('  ✓ Plan d\'assemblage IA créé avec 3 scénarios');

  // ============================================================
  // 10. MAINTENANCE (insertions individuelles)
  // ============================================================
  console.log('\n🔧 Création des maintenances...');

  const maintenances = [
    { container_id: containers['CI-04'], type: 'cleaning', scheduled: '2024-10-01', completed: '2024-10-03',
      status: 'done', description: 'Nettoyage vapeur haute pression + désinfection peracétique CI-04 avant vendange',
      tech: 'Pierre Martin', cost: 250.00, created_by: adminId,
      notes: 'Protocole : 3 rinçages eau froide → vapeur 90°C 20 min → peracétique 0.2% → rinçage eau chaude. Contrôle bactériologique OK.' },
    { container_id: containers['BAR-005'], type: 'cleaning', scheduled: '2024-10-04', completed: '2024-10-05',
      status: 'done', description: 'Nettoyage BAR-005 après départ en bouteilles du Deuxième Vin 2021',
      tech: 'Claire Blanc', cost: 0.00, created_by: op2Id,
      notes: 'Nettoyage eau chaude + solution soude 2%. Mise en soufre 1g stick. En attente affectation prochaine vendange.' },
    { container_id: containers['CI-01'], type: 'inspection', scheduled: '2025-01-15', completed: null,
      status: 'planned', description: 'Inspection annuelle joints et clapets CI-01, CI-02, CI-03',
      tech: 'TechnoVin SARL', cost: 1800.00, created_by: adminId,
      notes: 'Contrat maintenance annuel. Vérification joints obturateurs, vannes papillon, sondes températures.' },
    { container_id: containers['FDR-01'], type: 'repair', scheduled: '2024-11-20', completed: '2024-11-22',
      status: 'done', description: "Remplacement robinet de soutirage FDR-01 — défaut d'étanchéité détecté",
      tech: 'TechnoVin SARL', cost: 340.00, created_by: adminId,
      notes: "Robinet inox DN50 remplacé. Test étanchéité à l'eau effectué. Vin non affecté (lot transféré temporairement)." },
    { container_id: containers['CI-05'], type: 'calibration', scheduled: '2025-02-01', completed: null,
      status: 'planned', description: 'Calibration sondes température CI-05, CI-06 — exigence qualité ISO',
      tech: 'Pierre Martin', cost: 120.00, created_by: adminId,
      notes: 'Calibration annuelle obligatoire IQNET. Étalons certifiés COFRAC disponibles.' },
  ];

  for (const m of maintenances) {
    await query(`
      INSERT INTO barbote_maintenance (container_id, maintenance_type, scheduled_date, completed_date, status, description, technician, cost, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [m.container_id, m.type, m.scheduled, m.completed, m.status, m.description, m.tech, m.cost, m.notes, m.created_by]);
  }
  console.log(`  ✓ ${maintenances.length} maintenances créées`);

  // ============================================================
  // 11. CONVERSATIONS AI
  // ============================================================
  console.log('\n💬 Création des conversations AI de démo...');

  const conv1 = await query(`
    INSERT INTO barbote_conversations (user_id, title, context_type, context_ids, message_count, last_message_at)
    VALUES ($1, $2, 'analysis', $3::jsonb, 4, NOW() - interval '2 days')
    RETURNING id
  `, [oenoId, 'Analyse acidité volatile Merlot 2024', JSON.stringify({ lot_ids: [lots['MRL-2024-01']] })]);

  const c1id = conv1.rows[0].id;
  const msgs1 = [
    { role: 'user', content: "L'acidité volatile du Merlot 2024 est à 0.38 g/L. Est-ce préoccupant pour la suite de l'élevage ?", tokens: 45 },
    { role: 'assistant', content: `La valeur de 0.38 g/L d'acide volatile pour votre Merlot 2024 en cours de FML est tout à fait normale.

**Contexte réglementaire :** Limite légale AOC 0.98 g/L (vin rouge). Vous êtes à 39% du seuil.

**Pour votre Merlot 2024 :**
- La FML est en cours → montée en AV normale (+0.05 à +0.15 g/L attendus)
- Valeur cible fin FML : 0.40-0.50 g/L → parfaitement gérable

**Points de vigilance :**
1. Maintenez la température cave entre 18-22°C pour une FML rapide
2. Évitez toute contamination Brettanomyces
3. Analysez l'AV toutes les 2 semaines pendant la FML

**Aucune action corrective nécessaire** à ce stade.`, tokens: 180 },
    { role: 'user', content: 'Et si après la FML ça monte à 0.55 g/L, que faire ?', tokens: 25 },
    { role: 'assistant', content: `À 0.55 g/L post-FML, votre vin reste commercialisable mais une **vigilance accrue** est recommandée.

**Actions préventives immédiates :**
1. **Sulfitage** : Ajuster SO2 libre à 30-35 mg/L pour inhiber les bactéries acétiques
2. **Soutirage** : Éliminer les lies grossières (substrat pour B. aceti)
3. **Analyse microbiologique** : Numération acétobactéries si votre labo le permet

**Traitement possible (si progression continue) :**
- Nano-filtration tangentielle : option lourde, à considérer si AV > 0.75 g/L

Pour le Grand Vin, ciblez un AV < 0.50 g/L en fin d'élevage.`, tokens: 155 },
  ];
  for (const msg of msgs1) {
    await query(`INSERT INTO barbote_messages (conversation_id, role, content, tokens_used, model) VALUES ($1,$2,$3,$4,'gpt-5-mini-2025-08-07')`,
      [c1id, msg.role, msg.content, msg.tokens]);
  }

  const conv2 = await query(`
    INSERT INTO barbote_conversations (user_id, title, context_type, context_ids, message_count, last_message_at)
    VALUES ($1, $2, 'assemblage', '{"assemblage_plan_id":"nouveau"}'::jsonb, 3, NOW() - interval '5 days')
    RETURNING id
  `, [adminId, 'Assemblage Grand Vin 2024 — aide décision']);

  const c2id = conv2.rows[0].id;
  const msgs2 = [
    { role: 'user', content: "Pour l'assemblage Grand Vin 2024, j'hésite entre 65% Merlot / 25% CF ou 55% Merlot / 35% CF. Quelle option pour viser les concours ?", tokens: 55 },
    { role: 'assistant', content: `Pour un positionnement **concours internationaux** avec votre millésime 2024, je recommande **55% Merlot / 35% Cabernet Franc (VV 40 ans) / 10% CS**.

**Pourquoi cette option gagne les médailles :**

Le Cabernet Franc Vieilles Vignes est votre différenciateur :
- 40 ans de vigne = enracinement profond = complexité minérale unique
- Notes florales (violette, iris) très appréciées des dégustateurs concours

**Profil analytique projeté :**
- Alcool : ~13.4% (élégance vs puissance)
- pH : 3.50 (fraîcheur perçue supérieure)
- AV : ~0.35 g/L (propreté exemplaire)

**Ma recommandation :** Réalisez un essai à 20L des deux options, dégustez à l'aveugle avec Sophie et 2-3 cavistes.

Score IA estimé : **93.5/100** pour option CF premium vs 91.2/100 pour option classique.`, tokens: 280 },
    { role: 'user', content: 'Merci, on va faire les essais en décembre.', tokens: 15 },
  ];
  for (const msg of msgs2) {
    await query(`INSERT INTO barbote_messages (conversation_id, role, content, tokens_used, model) VALUES ($1,$2,$3,$4,'gpt-5-mini-2025-08-07')`,
      [c2id, msg.role, msg.content, msg.tokens]);
  }

  console.log('  ✓ 2 conversations IA créées avec historique complet');

  // ============================================================
  // 12. NOTIFICATIONS (insertions individuelles)
  // ============================================================
  console.log('\n🔔 Création des notifications...');

  const notifications = [
    { user_id: adminId, type: 'analysis_alert', title: 'Analyse requise — Merlot 2024',
      message: 'La FML du lot MRL-2024-01 est en cours depuis 15 jours. Une analyse chromatographie est recommandée.',
      data: { lot_id: lots['MRL-2024-01'], priority: 'medium' }, read: false },
    { user_id: adminId, type: 'assemblage_ready', title: "Plan d'assemblage GV2024 — Scénarios disponibles",
      message: "3 scénarios d'assemblage pour le Grand Vin 2024 ont été générés par l'IA. Votre validation est requise.",
      data: { priority: 'high' }, read: false },
    { user_id: oenoId, type: 'analysis_alert', title: 'SO2 libre à surveiller — GV 2022',
      message: 'Le SO2 libre du lot GV-2022-01 est à 32 mg/L. Seuil cible avant embouteillage : 35 mg/L.',
      data: { lot_id: lots['GV-2022-01'], priority: 'medium' }, read: false },
    { user_id: oenoId, type: 'movement_validated', title: 'Soutirage GV 2023 validé',
      message: 'Le soutirage du lot GV-2023-01 vers BAR-004 a été validé. Volume transféré : 17 120 L.',
      data: { lot_id: lots['GV-2023-01'], priority: 'low' }, read: true },
    { user_id: op1Id, type: 'maintenance_due', title: 'Maintenance planifiée — CI-01, CI-02, CI-03',
      message: "L'inspection annuelle des vannes et joints est planifiée au 15 janvier 2025.",
      data: { priority: 'medium' }, read: false },
    { user_id: op2Id, type: 'lot_created', title: 'Nouveau lot créé — Sauvignon Blanc 2024',
      message: 'Le lot SB-2024-04 (Sauvignon Blanc Prestige) a été créé et affecté à la cuve CI-05.',
      data: { lot_id: lots['SB-2024-04'], priority: 'low' }, read: true },
    { user_id: adminId, type: 'system', title: 'Mise à jour réglementaire SO2',
      message: 'Rappel : les nouveaux seuils SO2 pour les vins biologiques entrent en vigueur au 01/01/2025 (−30 mg/L sur totaux).',
      data: { priority: 'high', regulatory: true }, read: false },
  ];

  for (const n of notifications) {
    await query(`INSERT INTO barbote_notifications (user_id, type, title, message, data, read) VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
      [n.user_id, n.type, n.title, n.message, JSON.stringify(n.data), n.read]);
  }
  console.log(`  ✓ ${notifications.length} notifications créées`);

  // ============================================================
  // RÉSUMÉ FINAL
  // ============================================================
  const counts = await query(`
    SELECT
      (SELECT COUNT(*) FROM barbote_users)           AS users,
      (SELECT COUNT(*) FROM barbote_containers)       AS containers,
      (SELECT COUNT(*) FROM barbote_lots)             AS lots,
      (SELECT COUNT(*) FROM barbote_lot_containers)   AS lot_containers,
      (SELECT COUNT(*) FROM barbote_movements)        AS movements,
      (SELECT COUNT(*) FROM barbote_analyses)         AS analyses,
      (SELECT COUNT(*) FROM barbote_operations)       AS operations,
      (SELECT COUNT(*) FROM barbote_inputs)           AS inputs,
      (SELECT COUNT(*) FROM barbote_assemblage_plans) AS assemblage_plans,
      (SELECT COUNT(*) FROM barbote_maintenance)      AS maintenance,
      (SELECT COUNT(*) FROM barbote_conversations)    AS conversations,
      (SELECT COUNT(*) FROM barbote_messages)         AS messages,
      (SELECT COUNT(*) FROM barbote_notifications)    AS notifications
  `);

  const c = counts.rows[0];
  console.log('\n✅ Seed terminé avec succès!\n');
  console.log('═══════════════════════════════════════');
  console.log('  CHÂTEAU MARCELOT — Données de démo');
  console.log('═══════════════════════════════════════');
  console.log(`  👤 Utilisateurs      : ${c.users}`);
  console.log(`  🛢️  Contenants        : ${c.containers}`);
  console.log(`  🍇 Lots de vin       : ${c.lots}`);
  console.log(`  🔗 Affectations      : ${c.lot_containers}`);
  console.log(`  🔄 Mouvements        : ${c.movements}`);
  console.log(`  🔬 Analyses          : ${c.analyses}`);
  console.log(`  ⚗️  Opérations        : ${c.operations}`);
  console.log(`  🧪 Intrants          : ${c.inputs}`);
  console.log(`  🤖 Plans assemblage  : ${c.assemblage_plans}`);
  console.log(`  🔧 Maintenances      : ${c.maintenance}`);
  console.log(`  💬 Conversations IA  : ${c.conversations} (${c.messages} messages)`);
  console.log(`  🔔 Notifications     : ${c.notifications}`);
  console.log('═══════════════════════════════════════');
  console.log('\n📋 Comptes de connexion:');
  console.log('  admin@chateau-marcelot.fr        → Admin2024!');
  console.log('  sophie.duval@chateau-marcelot.fr → Oenologue2024!');
  console.log('  pierre.martin@chateau-marcelot.fr → Operateur2024!');
  console.log('  client@negoce-bordeaux.fr        → Viewer2024!');

  await pool.end();
}

seed().catch(err => {
  console.error('❌ Erreur seed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
