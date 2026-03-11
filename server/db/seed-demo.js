// =============================================================================
// BARBOTE — SEED DÉMO BOOST
// Injecte une quantité massive de données réalistes sur le compte admin@barbote.local
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

async function q(text, params = []) {
  const client = await pool.connect();
  try { return await client.query(text, params); }
  finally { client.release(); }
}

function rand(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function seed() {
  console.log('🍷 SEED DÉMO BOOST — Château Marcelot complet\n');

  // -------------------------------------------------------
  // Récupère les IDs existants
  // -------------------------------------------------------
  const usersRes = await q(`SELECT id, email, role FROM barbote_users`);
  const adminUser  = usersRes.rows.find(u => u.email === 'admin@barbote.local') ||
                     usersRes.rows.find(u => u.role === 'admin');
  const oenoUser   = usersRes.rows.find(u => u.role === 'oenologue') || adminUser;
  const op1User    = usersRes.rows.find(u => u.name === 'Pierre Martin') ||
                     usersRes.rows.find(u => u.role === 'operator') || adminUser;
  const op2User    = usersRes.rows.find(u => u.name === 'Claire Blanc') ||
                     usersRes.rows.filter(u => u.role === 'operator')[1] || adminUser;

  const adminId = adminUser.id;
  const oenoId  = oenoUser.id;
  const op1Id   = op1User.id;
  const op2Id   = op2User.id;

  console.log(`Admin: ${adminUser.email}`);

  // -------------------------------------------------------
  // 1. LOTS SUPPLÉMENTAIRES (20 lots variés)
  // -------------------------------------------------------
  console.log('\n🍇 Création de 20 lots supplémentaires...');

  const lotsData = [
    // Rouges 2024
    ['MRL-2024-B01','Merlot Terroir 2024','rouge','AOC Bordeaux',2024,'[{"variety":"Merlot","percentage":100}]',15000,14200,'active',84.5,'2024-10-08','{"alcohol_percent":13.0,"ph":3.48,"volatile_acidity_gl":0.42,"total_acidity_gl":6.0,"free_so2_mgl":20,"total_so2_mgl":58}','Lot standard, bonne qualité.'],
    ['CS-2024-B02','CS Vieilles Vignes 2024','rouge','AOC Haut-Médoc',2024,'[{"variety":"Cabernet Sauvignon","percentage":100}]',8000,7800,'active',89.0,'2024-10-08','{"alcohol_percent":14.0,"ph":3.38,"volatile_acidity_gl":0.35,"total_acidity_gl":6.4,"free_so2_mgl":15,"total_so2_mgl":48}','Parcelle argilo-calcaire, tanins fermes.'],
    ['MER-2024-B03','Merlot Bio 2024','rouge','AOC Saint-Émilion',2024,'[{"variety":"Merlot","percentage":90},{"variety":"Cabernet Franc","percentage":10}]',6500,6500,'active',92.0,'2024-09-28','{"alcohol_percent":13.6,"ph":3.56,"volatile_acidity_gl":0.30,"total_acidity_gl":5.7,"free_so2_mgl":18,"total_so2_mgl":52}','Certification bio. Raisins parfaits.'],
    ['PET-2024-B04','Petit Verdot 2024','rouge','AOC Médoc',2024,'[{"variety":"Petit Verdot","percentage":100}]',3500,3500,'active',87.0,'2024-10-15','{"alcohol_percent":14.5,"ph":3.35,"volatile_acidity_gl":0.38,"total_acidity_gl":6.8,"free_so2_mgl":12,"total_so2_mgl":42}','Cépage accessoire, couleur très intense.'],
    // Rouges 2023
    ['BLK-2023-B05','Blend Classique 2023','rouge','AOC Bordeaux',2023,'[{"variety":"Merlot","percentage":60},{"variety":"Cabernet Sauvignon","percentage":30},{"variety":"Malbec","percentage":10}]',25000,23400,'active',86.0,'2023-10-01','{"alcohol_percent":13.5,"ph":3.58,"volatile_acidity_gl":0.44,"total_acidity_gl":5.6,"free_so2_mgl":28,"total_so2_mgl":80}','Entrée de gamme exportation USA.'],
    ['RES-2023-B06','Réserve Signature 2023','rouge','AOC Pauillac',2023,'[{"variety":"Cabernet Sauvignon","percentage":70},{"variety":"Merlot","percentage":20},{"variety":"Petit Verdot","percentage":10}]',12000,11200,'active',95.0,'2023-09-25','{"alcohol_percent":14.2,"ph":3.60,"volatile_acidity_gl":0.40,"total_acidity_gl":5.4,"free_so2_mgl":32,"total_so2_mgl":90}','Cuvée prestige. 18 mois barriques neuves.'],
    ['CAB-2023-B07','Cabernet Parcelle A 2023','rouge','AOC Médoc',2023,'[{"variety":"Cabernet Sauvignon","percentage":100}]',9000,8600,'active',88.5,'2023-10-05','{"alcohol_percent":13.8,"ph":3.42,"volatile_acidity_gl":0.45,"total_acidity_gl":6.1,"free_so2_mgl":25,"total_so2_mgl":75}','Mono-cépage, caractère minéral.'],
    // Rouges 2022 (en élevage long ou prêts)
    ['GRV-2022-B08','Grande Réserve 2022','rouge','AOC Saint-Julien',2022,'[{"variety":"Cabernet Sauvignon","percentage":65},{"variety":"Merlot","percentage":25},{"variety":"Cabernet Franc","percentage":10}]',10000,9200,'active',97.0,'2022-09-22','{"alcohol_percent":14.4,"ph":3.66,"volatile_acidity_gl":0.47,"total_acidity_gl":5.2,"free_so2_mgl":34,"total_so2_mgl":95}','Millésime exceptionnel. Parker 97 pts.'],
    ['MIS-2022-B09','Cuvée Mise 2022','rouge','AOC Bordeaux',2022,'[{"variety":"Merlot","percentage":75},{"variety":"Cabernet Sauvignon","percentage":25}]',35000,0,'bottled','2022-10-01','{"alcohol_percent":13.2,"ph":3.52,"volatile_acidity_gl":0.50,"total_acidity_gl":5.8,"free_so2_mgl":30,"total_so2_mgl":85}','Mis en bouteilles mars 2024. 200 000 cols.', 82.0],
    // Blancs
    ['GRAV-2024-B10','Graves Blanc 2024','blanc','AOC Pessac-Léognan',2024,'[{"variety":"Sauvignon Blanc","percentage":60},{"variety":"Sémillon","percentage":40}]',11000,11000,'active',90.0,'2024-09-05','{"alcohol_percent":13.0,"ph":3.20,"residual_sugar_gl":2.5,"total_acidity_gl":7.5,"free_so2_mgl":30,"total_so2_mgl":78}','Élevage 8 mois barriques neuves 30%.'],
    ['MUS-2024-B11','Muscadelle Douce 2024','blanc','AOC Bordeaux Blanc',2024,'[{"variety":"Muscadelle","percentage":100}]',4000,4000,'active',83.0,'2024-09-12','{"alcohol_percent":12.5,"ph":3.30,"residual_sugar_gl":8.2,"total_acidity_gl":6.8,"free_so2_mgl":35,"total_so2_mgl":90}','Moelleux léger. Marché asiatique.'],
    ['SAU-2023-B12','Sauvignon Vieilles Vignes 2023','blanc','AOC Bordeaux Blanc',2023,'[{"variety":"Sauvignon Blanc","percentage":100}]',7000,6500,'active',88.0,'2023-09-08','{"alcohol_percent":12.9,"ph":3.22,"residual_sugar_gl":1.9,"total_acidity_gl":7.4,"free_so2_mgl":28,"total_so2_mgl":72}','Parcelle 35 ans. Notes tropicales intenses.'],
    // Rosés
    ['ROSE-2024-B13','Rosé de Saignée 2024','rose','AOC Bordeaux Rosé',2024,'[{"variety":"Merlot","percentage":80},{"variety":"Cabernet Franc","percentage":20}]',5000,4800,'active',85.0,'2024-09-20','{"alcohol_percent":12.8,"ph":3.28,"residual_sugar_gl":3.1,"total_acidity_gl":6.5,"free_so2_mgl":22,"total_so2_mgl":62}','Saignée à froid 6h. Couleur pêche intense.'],
    // Lots vendus / archivés
    ['VRAC-2021-B14','Bordeaux Vrac 2021','rouge','AOC Bordeaux',2021,'[{"variety":"Merlot","percentage":70},{"variety":"Cabernet Sauvignon","percentage":30}]',80000,0,'sold','2021-10-10','{}','Vendu en vrac à Pierre Chanau Négoce.',79.0],
    ['ARC-2020-B15','Archive Merlot 2020','rouge','AOC Pomerol',2020,'[{"variety":"Merlot","percentage":100}]',5000,0,'archived','2020-09-28','{}','Lot archivé après retrait qualité.',76.0],
    // Nouveaux lots vinification en cours
    ['MAL-2024-B16','Malbec Essai 2024','rouge','AOC Bordeaux',2024,'[{"variety":"Malbec","percentage":100}]',2500,2500,'active',null,'2024-10-18','{}','Premier essai Malbec du domaine.'],
    ['CARB-2024-B17','Carmenère Micro 2024','rouge','IGP Atlantique',2024,'[{"variety":"Carménère","percentage":100}]',1500,1500,'active',null,'2024-10-20','{}','Micro-cuvée expérimentale. 2000 bouteilles max.'],
    ['CREM-2024-B18','Crémant Blanc 2024','mousseux','AOC Crémant de Bordeaux',2024,'[{"variety":"Sémillon","percentage":50},{"variety":"Sauvignon Blanc","percentage":30},{"variety":"Muscadelle","percentage":20}]',8000,8000,'active',86.0,'2024-09-15','{"alcohol_percent":11.5,"ph":3.10,"residual_sugar_gl":12.0,"total_acidity_gl":8.2,"free_so2_mgl":38,"total_so2_mgl":95}','Tirage 2ème fermentation prévu janvier 2025.'],
    // Lots issus d\'assemblage
    ['ASS-2023-B19','Assemblage Prestige 2023','rouge','AOC Pauillac',2023,'[{"variety":"Cabernet Sauvignon","percentage":72},{"variety":"Merlot","percentage":18},{"variety":"Cabernet Franc","percentage":10}]',6000,5800,'active',94.0,'2023-09-30','{"alcohol_percent":14.1,"ph":3.63,"volatile_acidity_gl":0.41,"total_acidity_gl":5.3,"free_so2_mgl":31,"total_so2_mgl":88}','Assemblage final après essais oenologue.'],
    ['BIO-2023-B20','Biodynamique Rouge 2023','rouge','AOC Saint-Émilion Grand Cru',2023,'[{"variety":"Merlot","percentage":80},{"variety":"Cabernet Franc","percentage":20}]',4500,4300,'active',93.5,'2023-09-26','{"alcohol_percent":13.9,"ph":3.57,"volatile_acidity_gl":0.33,"total_acidity_gl":5.6,"free_so2_mgl":20,"total_so2_mgl":55}','Certification biodynamique Demeter. SO2 réduit.'],
  ];

  const lots = {};
  let lotCount = 0;
  for (const [lot_number, name, type, appellation, vintage_year, grape_varieties, initial_volume_liters, current_volume_liters, status, score_or_date, second, third, notes_or_quality] of lotsData) {
    // Handle the varied argument positions
    let quality_score, harvest_date, analysis_matrix, notes;
    if (typeof score_or_date === 'number') {
      quality_score = score_or_date;
      harvest_date = second;
      analysis_matrix = third;
      notes = notes_or_quality;
    } else {
      harvest_date = score_or_date;
      analysis_matrix = second;
      notes = third;
      quality_score = null;
    }
    // Special handling for sold/archived lots with numbers in wrong place
    if (status === 'sold' || status === 'archived') {
      harvest_date = '2021-10-10';
      analysis_matrix = '{}';
      quality_score = typeof notes_or_quality === 'number' ? notes_or_quality : null;
      notes = typeof notes_or_quality === 'string' ? notes_or_quality : second;
    }

    try {
      const res = await q(`
        INSERT INTO barbote_lots (lot_number, name, type, appellation, vintage_year, grape_varieties, initial_volume_liters, current_volume_liters, status, quality_score, harvest_date, analysis_matrix, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)
        ON CONFLICT (lot_number) DO UPDATE SET current_volume_liters = EXCLUDED.current_volume_liters
        RETURNING id, lot_number
      `, [lot_number, name, type, appellation, vintage_year, grape_varieties, initial_volume_liters, current_volume_liters, status, quality_score || null, harvest_date || null, analysis_matrix || '{}', notes || null, adminId]);
      lots[lot_number] = res.rows[0].id;
      lotCount++;
    } catch(e) {
      console.error(`  ⚠ Lot ${lot_number}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${lotCount} lots créés`);

  // Récupère aussi les lots du seed précédent
  const existingLots = await q(`SELECT id, lot_number FROM barbote_lots`);
  for (const l of existingLots.rows) lots[l.lot_number] = l.id;

  // Récupère les contenants existants
  const existingContainers = await q(`SELECT id, code FROM barbote_containers`);
  const containers = {};
  for (const c of existingContainers.rows) containers[c.code] = c.id;

  // -------------------------------------------------------
  // 2. MOUVEMENTS EN MASSE (50+ mouvements variés et récents)
  // -------------------------------------------------------
  console.log('\n🔄 Création de 50 mouvements récents...');

  const movTypes = ['entree','soutirage','transfert','sulfitage','filtration','collage','perte','bottling'];
  const lotKeys = Object.keys(lots);
  const containerKeys = Object.keys(containers);

  const movementsData = [
    // Semaine dernière — activité intensive vendange
    { movement_type:'entree', lot_id:lots['MRL-2024-B01'], to_container_id:containers['CI-04'], volume_liters:15000, date:daysAgo(1), operator_id:op1Id, reason:'Entrée vendange Merlot Terroir 2024', notes:'Densité 1.082. Bon état sanitaire.', validated:true, validated_by:oenoId },
    { movement_type:'entree', lot_id:lots['CS-2024-B02'], to_container_id:containers['CB-01'], volume_liters:8000, date:daysAgo(2), operator_id:op2Id, reason:'CS VV 2024 — pressoir direct', notes:'Extraction douce. Température contrôlée 16°C.', validated:true, validated_by:oenoId },
    { movement_type:'entree', lot_id:lots['GRAV-2024-B10'], to_container_id:containers['CI-06'], volume_liters:11000, date:daysAgo(3), operator_id:op1Id, reason:'Graves Blanc — pressurage pneumatique', notes:'Jus propre, débourbage 24h à 8°C.', validated:true, validated_by:oenoId },
    { movement_type:'sulfitage', lot_id:lots['MRL-2024-B01'], to_container_id:containers['CI-04'], volume_liters:15000, date:daysAgo(1), operator_id:op1Id, reason:'Sulfitage pré-fermentaire', notes:'5g/hL métabisulfite. SO2 libre cible 25 mg/L.', validated:true, validated_by:oenoId },
    { movement_type:'sulfitage', lot_id:lots['GRAV-2024-B10'], to_container_id:containers['CI-06'], volume_liters:11000, date:daysAgo(3), operator_id:op2Id, reason:'Protection antioxydante blanc', notes:'7g/hL. pH bas — dose ajustée.', validated:true, validated_by:oenoId },
    { movement_type:'transfert', lot_id:lots['MER-2024-B03'], from_container_id:containers['CB-02'], to_container_id:containers['CI-04'], volume_liters:6200, date:daysAgo(4), operator_id:op1Id, reason:'Transfert post-fermentation — décuvage', notes:'Pressurage en cours. Volume vin de presse à intégrer selon analyses.', validated:true, validated_by:oenoId },
    { movement_type:'soutirage', lot_id:lots['RES-2023-B06'], from_container_id:containers['FDR-01'], to_container_id:containers['BAR-001'], volume_liters:3800, date:daysAgo(5), operator_id:op1Id, reason:'2ème soutirage Réserve Signature 2023', notes:'Perte lies: 200L. Bonne brillance. Sulfitage ajusté.', validated:true, validated_by:oenoId, volume_loss_liters:200 },
    { movement_type:'soutirage', lot_id:lots['BIO-2023-B20'], from_container_id:containers['CB-01'], to_container_id:containers['BAR-002'], volume_liters:4200, date:daysAgo(6), operator_id:op2Id, reason:'Soutirage biodynamique — pleine lune', notes:'Calendrier biodynamique respecté. Brillance naturelle.', validated:true, validated_by:oenoId, volume_loss_liters:100 },
    { movement_type:'sulfitage', lot_id:lots['ASS-2023-B19'], to_container_id:containers['BAR-004'], volume_liters:5800, date:daysAgo(7), operator_id:op1Id, reason:'Maintien SO2 libre élevage barrique', notes:'Objectif 28 mg/L. Mesure post-ajout dans 48h.', validated:true, validated_by:oenoId },
    { movement_type:'filtration', lot_id:lots['SAU-2023-B12'], from_container_id:containers['CI-05'], to_container_id:containers['CIT-01'], volume_liters:6400, date:daysAgo(8), operator_id:op1Id, reason:'Filtration stérilisante avant mise vrac', notes:'Turbidité finale 0.3 NTU. Contrôle microbiologique OK.', validated:true, validated_by:oenoId },
    { movement_type:'soutirage', lot_id:lots['GRV-2022-B08'], from_container_id:containers['FDR-02'], to_container_id:containers['BAR-006'], volume_liters:9000, date:daysAgo(9), operator_id:op2Id, reason:'Soutirage final avant embouteillage prévu', notes:'Dernière prise de contact. Analyse complète commandée.', validated:true, validated_by:oenoId, volume_loss_liters:200 },
    // Semaine -2
    { movement_type:'collage', lot_id:lots['GRV-2022-B08'], to_container_id:containers['FDR-02'], volume_liters:9200, date:daysAgo(12), operator_id:op2Id, reason:'Collage gélatine avant embouteillage', notes:'Dose 3g/hL. Test chaleur préalable : positif.', validated:true, validated_by:oenoId },
    { movement_type:'filtration', lot_id:lots['ASS-2023-B19'], from_container_id:containers['BAR-004'], to_container_id:containers['CI-04'], volume_liters:5700, date:daysAgo(13), operator_id:op1Id, reason:'Dégrossissement Assemblage Prestige 2023', notes:'Turbidité entrée 12 NTU → sortie 2 NTU.', validated:true, validated_by:oenoId },
    { movement_type:'transfert', lot_id:lots['ROSE-2024-B13'], from_container_id:containers['CI-03'], to_container_id:containers['CI-05'], volume_liters:4800, date:daysAgo(14), operator_id:op2Id, reason:'Transfert rosé post-saignée vers cuve de clarification', notes:'Couleur vive saumon. pH 3.28. Acide citrique à envisager.', validated:true, validated_by:oenoId },
    { movement_type:'soutirage', lot_id:lots['BLK-2023-B05'], from_container_id:containers['FDR-01'], to_container_id:containers['CIT-01'], volume_liters:23000, date:daysAgo(15), operator_id:op1Id, reason:'Transfert Blend Classique vers stockage citerne export', notes:'Volume conforme. SO2 vérifié. Prêt pour analyse expédition.', validated:true, validated_by:oenoId, volume_loss_liters:400 },
    { movement_type:'sulfitage', lot_id:lots['BLK-2023-B05'], to_container_id:containers['CIT-01'], volume_liters:23000, date:daysAgo(15), operator_id:op1Id, reason:'Sulfitage transport — protection voyage', notes:'10g/hL dose conservation transport maritime.', validated:true, validated_by:oenoId },
    { movement_type:'entree', lot_id:lots['CREM-2024-B18'], to_container_id:containers['CI-06'], volume_liters:8000, date:daysAgo(16), operator_id:op2Id, reason:'Réception moût Crémant — pressurage direct', notes:'Pression max 1.5 bar respectée. Moût clair.', validated:true, validated_by:oenoId },
    { movement_type:'collage', lot_id:lots['SAU-2023-B12'], to_container_id:containers['CI-05'], volume_liters:6800, date:daysAgo(17), operator_id:op1Id, reason:'Bentonite Sauvignon 2023 — élimination protéines', notes:'80g/hL bentonite sodique. Durée contact 5j.', validated:true, validated_by:oenoId },
    // Semaine -3
    { movement_type:'transfert', lot_id:lots['GRAV-2024-B10'], from_container_id:containers['CI-06'], to_container_id:containers['BAR-003'], volume_liters:3300, date:daysAgo(21), operator_id:op1Id, reason:'Mise en barrique 30% Graves Blanc — élevage', notes:'1/3 barrique neuve, 2/3 1er passage.', validated:true, validated_by:oenoId },
    { movement_type:'soutirage', lot_id:lots['CAB-2023-B07'], from_container_id:containers['FDR-02'], to_container_id:containers['BAR-001'], volume_liters:8500, date:daysAgo(22), operator_id:op2Id, reason:'Soutirage Cabernet Parcelle A 2023', notes:'Remontages terminés. Clarification naturelle en cours.', validated:true, validated_by:oenoId, volume_loss_liters:100 },
    { movement_type:'filtration', lot_id:lots['MUS-2024-B11'], from_container_id:containers['CI-05'], to_container_id:containers['CI-03'], volume_liters:3900, date:daysAgo(23), operator_id:op2Id, reason:'Filtration Muscadelle — clarification légère', notes:'Garde du sucre résiduel. Turbidité finale 1.2 NTU.', validated:true, validated_by:oenoId },
    { movement_type:'perte', lot_id:lots['PET-2024-B04'], to_container_id:containers['CI-04'], volume_liters:85, date:daysAgo(24), operator_id:op1Id, reason:'Perte contrôle qualité — lot déclassé partiel', notes:'12 bouteilles essai défectueuses. Volume déclaré aux douanes.', validated:true, validated_by:adminId },
    { movement_type:'soutirage', lot_id:lots['MER-2024-B03'], from_container_id:containers['CB-02'], to_container_id:containers['CI-04'], volume_liters:6300, date:daysAgo(25), operator_id:op1Id, reason:'Premier soutirage Merlot Bio 2024 — post-FML', notes:'FML terminée (chromatographie). Lies grossières éliminées.', validated:true, validated_by:oenoId, volume_loss_liters:200 },
    // Mois dernier
    { movement_type:'bottling', lot_id:lots['MIS-2022-B09'], from_container_id:containers['CIT-01'], volume_liters:35000, date:daysAgo(35), operator_id:op1Id, reason:'Mise en bouteilles Cuvée Mise 2022 — chaîne embouteillage', notes:'200 000 cols. Bouchon liège TCA < 0.5 ng/L certifié. Étiquetage automatisé.', validated:true, validated_by:adminId },
    { movement_type:'transfert', lot_id:lots['RES-2023-B06'], from_container_id:containers['BAR-001'], to_container_id:containers['BAR-002'], volume_liters:4000, date:daysAgo(38), operator_id:op2Id, reason:'Rotation barriques Réserve Signature 2023', notes:'Standardisation infusion boisé. Dégustation OK.', validated:true, validated_by:oenoId },
    { movement_type:'soutirage', lot_id:lots['GRV-2022-B08'], from_container_id:containers['FDR-01'], to_container_id:containers['FDR-02'], volume_liters:9400, date:daysAgo(40), operator_id:op1Id, reason:'3ème soutirage Grande Réserve 2022 — avant mise', notes:'Analyse Parker planifiée. Consultant Rolland rendez-vous.', validated:true, validated_by:oenoId, volume_loss_liters:200 },
    { movement_type:'sulfitage', lot_id:lots['GRV-2022-B08'], to_container_id:containers['FDR-02'], volume_liters:9200, date:daysAgo(40), operator_id:op1Id, reason:'Maintien SO2 libre avant embouteillage', notes:'Cible 35 mg/L. Analyse dans 7 jours.', validated:true, validated_by:oenoId },
    { movement_type:'transfert', lot_id:lots['BLK-2023-B05'], from_container_id:containers['CI-01'], to_container_id:containers['FDR-01'], volume_liters:24000, date:daysAgo(45), operator_id:op2Id, reason:'Blend Classique — transfert vers foudre élevage', notes:'3 mois foudre prévu. Mise en lot exportation.', validated:true, validated_by:oenoId },
    { movement_type:'entree', lot_id:lots['MAL-2024-B16'], to_container_id:containers['CB-01'], volume_liters:2500, date:daysAgo(46), operator_id:op2Id, reason:'Malbec premier essai — cuve béton', notes:'Micro-vinification cuve béton œuf. Fermentation spontanée partielle.', validated:true, validated_by:oenoId },
    { movement_type:'entree', lot_id:lots['CARB-2024-B17'], to_container_id:containers['BAR-005'], volume_liters:1500, date:daysAgo(47), operator_id:op1Id, reason:'Carménère micro-cuvée expérimentale', notes:'Barrique 225L suffit. Cuvaison 18 jours.', validated:false, validated_by:null },
    // Mois -2
    { movement_type:'filtration', lot_id:lots['CAB-2023-B07'], from_container_id:containers['BAR-001'], to_container_id:containers['CI-03'], volume_liters:8600, date:daysAgo(55), operator_id:op1Id, reason:'Filtration Cabernet 2023 avant élevage foudre', notes:'Dégrossissement 5 µm. Turbidité finale 3 NTU.', validated:true, validated_by:oenoId },
    { movement_type:'soutirage', lot_id:lots['ASS-2023-B19'], from_container_id:containers['CI-01'], to_container_id:containers['BAR-004'], volume_liters:5900, date:daysAgo(60), operator_id:op2Id, reason:'Mise en barrique Assemblage Prestige 2023', notes:'100% barrique neuve. Programme 14 mois.', validated:true, validated_by:oenoId, volume_loss_liters:100 },
    { movement_type:'collage', lot_id:lots['GRV-2022-B08'], to_container_id:containers['FDR-01'], volume_liters:9600, date:daysAgo(62), operator_id:op1Id, reason:'Collage pré-embouteillage Grande Réserve', notes:'Gélatine 2g/hL + bentonite 20g/hL. Double action.', validated:true, validated_by:oenoId },
    { movement_type:'sulfitage', lot_id:lots['BIO-2023-B20'], to_container_id:containers['BAR-002'], volume_liters:4300, date:daysAgo(65), operator_id:op2Id, reason:'SO2 réduit cuvée biodynamique', notes:'3g/hL uniquement. Objectif certification SO2 < 50mg/L total.', validated:true, validated_by:oenoId },
    { movement_type:'transfert', lot_id:lots['ROSE-2024-B13'], from_container_id:containers['CI-05'], to_container_id:containers['CI-03'], volume_liters:4700, date:daysAgo(67), operator_id:op1Id, reason:'Transfert rosé vers cuve réfrigérée stabilisation', notes:'Stabilisation tartrique à froid -4°C pendant 7 jours.', validated:true, validated_by:oenoId },
    { movement_type:'filtration', lot_id:lots['ROSE-2024-B13'], from_container_id:containers['CI-03'], to_container_id:containers['CI-05'], volume_liters:4650, date:daysAgo(60), operator_id:op2Id, reason:'Filtration rosé post-stabilisation tartrique', notes:'Turbidité finale 0.8 NTU. Couleur préservée.', validated:true, validated_by:oenoId },
    // Vieux mouvements
    { movement_type:'soutirage', lot_id:lots['BIO-2023-B20'], from_container_id:containers['CI-01'], to_container_id:containers['CB-01'], volume_liters:4400, date:daysAgo(85), operator_id:op1Id, reason:'1er soutirage Biodynamique 2023', notes:'Post-FML. Lies fines conservées 3 semaines.', validated:true, validated_by:oenoId, volume_loss_liters:100 },
    { movement_type:'transfert', lot_id:lots['RES-2023-B06'], from_container_id:containers['CI-02'], to_container_id:containers['BAR-001'], volume_liters:11500, date:daysAgo(90), operator_id:op2Id, reason:'Mise en barrique Réserve Signature 2023', notes:'100% barrique neuve 225L allier.', validated:true, validated_by:oenoId },
    { movement_type:'soutirage', lot_id:lots['CAB-2023-B07'], from_container_id:containers['CI-03'], to_container_id:containers['BAR-001'], volume_liters:8700, date:daysAgo(120), operator_id:op1Id, reason:'Premier soutirage Cabernet 2023 post-FML', notes:'FML terminée 100%. Lies éliminées.', validated:true, validated_by:oenoId, volume_loss_liters:300 },
    { movement_type:'entree', lot_id:lots['MIS-2022-B09'], to_container_id:containers['CIT-01'], volume_liters:35000, date:daysAgo(150), operator_id:op1Id, reason:'Transfert Cuvée Mise 2022 vers citerne avant embouteillage', notes:'Dernier ajustement SO2 effectué.', validated:true, validated_by:oenoId },
    { movement_type:'collage', lot_id:lots['BLK-2023-B05'], to_container_id:containers['CI-01'], volume_liters:24500, date:daysAgo(160), operator_id:op2Id, reason:'Collage Blend Classique — fining avant export', notes:'Gélatine 3g/hL pour réduction tanins astringents.', validated:true, validated_by:oenoId },
  ];

  let mvtCount = 0;
  for (const m of movementsData) {
    try {
      await q(`
        INSERT INTO barbote_movements (
          movement_type, lot_id, from_container_id, to_container_id, volume_liters, date,
          operator_id, volume_loss_liters, inputs, source_lots, reason, notes,
          validated, validated_by, validated_at, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'[]'::jsonb,'[]'::jsonb,$9,$10,$11,$12,$13,$14)
      `, [
        m.movement_type, m.lot_id || null, m.from_container_id || null, m.to_container_id || null,
        m.volume_liters, m.date, m.operator_id, m.volume_loss_liters || 0,
        m.reason, m.notes || null,
        m.validated || false, m.validated_by || null,
        m.validated ? m.date : null, adminId
      ]);
      mvtCount++;
    } catch(e) {
      console.error(`  ⚠ Mouvement ${m.movement_type}/${m.lot_id}: ${e.message.slice(0,80)}`);
    }
  }
  console.log(`  ✓ ${mvtCount} mouvements créés`);

  // -------------------------------------------------------
  // 3. ANALYSES EN MASSE (30+ analyses récentes)
  // -------------------------------------------------------
  console.log('\n🔬 Création de 30 analyses...');

  const analysesData = [
    // Merlot Terroir 2024 — suivi fermentation
    { lot:'MRL-2024-B01', ctn:'CI-04', date:daysAgo(1), type:'quick', alcohol:0, rs:null, ta:7.2, va:0.25, ph:3.40, fso2:20, tso2:46, malic:5.5, lactic:0, tart:4.3, ci:1.88, ch:0.90, turb:5.1, temp:21.0, dens:1.0861, comment:'Début fermentation active.' },
    // CS VV 2024
    { lot:'CS-2024-B02', ctn:'CB-01', date:daysAgo(2), type:'quick', alcohol:0, rs:null, ta:6.9, va:0.28, ph:3.35, fso2:15, tso2:38, malic:5.8, lactic:0, tart:4.0, ci:1.72, ch:0.88, turb:6.2, temp:18.0, dens:1.0920, comment:'Première analyse. Démarrage fermentation prévu 48h.' },
    // Graves Blanc 2024
    { lot:'GRAV-2024-B10', ctn:'CI-06', date:daysAgo(3), type:'standard', alcohol:0, rs:null, ta:7.8, va:0.20, ph:3.15, fso2:30, tso2:62, malic:3.5, lactic:0, tart:5.1, ci:null, ch:null, turb:8.2, temp:10.0, dens:1.0820, comment:'Débourbage 24h. Jus très propre.' },
    { lot:'GRAV-2024-B10', ctn:'CI-06', date:daysAgo(10), type:'standard', alcohol:11.5, rs:5.2, ta:7.4, va:0.24, ph:3.18, fso2:28, tso2:68, malic:2.8, lactic:0, tart:4.8, ci:null, ch:null, turb:2.1, temp:14.0, dens:1.0221, comment:'Mi-fermentation. Profil aromatique excellent.' },
    // Réserve Signature 2023
    { lot:'RES-2023-B06', ctn:'BAR-001', date:daysAgo(5), type:'complete', lab:'Laboratoire Dubernet', alcohol:14.2, rs:0.8, ta:5.4, va:0.40, ph:3.60, fso2:32, tso2:90, malic:0, lactic:1.9, tart:2.8, ci:1.48, ch:0.72, turb:0.6, temp:14.5, dens:0.9910, comment:'Élevage parfait. Notes de cèdre et cassis. Prêt à 90%.' },
    { lot:'RES-2023-B06', ctn:'BAR-001', date:daysAgo(30), type:'standard', alcohol:14.1, rs:0.9, ta:5.5, va:0.38, ph:3.59, fso2:30, tso2:88, malic:0, lactic:1.8, tart:2.9, ci:1.50, ch:0.71, turb:0.9, temp:15.0, dens:0.9912, comment:'Évolution positive. Tanins en train de se fondre.' },
    // Grande Réserve 2022
    { lot:'GRV-2022-B08', ctn:'FDR-02', date:daysAgo(9), type:'complete', lab:'Oenolab Bordeaux + Parker', alcohol:14.4, rs:0.6, ta:5.2, va:0.47, ph:3.66, fso2:34, tso2:95, malic:0, lactic:2.2, tart:2.6, ci:1.58, ch:0.68, turb:0.4, temp:14.0, dens:0.9903, comment:'Analyse pré-embouteillage finale. RAS. Bouteille d\'honneur planifiée.' },
    { lot:'GRV-2022-B08', ctn:'FDR-02', date:daysAgo(40), type:'complete', lab:'Laboratoire Oenolab Bordeaux', alcohol:14.3, rs:0.7, ta:5.3, va:0.45, ph:3.65, fso2:31, tso2:90, malic:0, lactic:2.1, tart:2.7, ci:1.55, ch:0.69, turb:0.6, temp:14.0, dens:0.9905, comment:'Profil stable. Patience encore 3 mois.' },
    // Assemblage Prestige 2023
    { lot:'ASS-2023-B19', ctn:'BAR-004', date:daysAgo(7), type:'standard', alcohol:14.1, rs:0.8, ta:5.3, va:0.41, ph:3.63, fso2:31, tso2:88, malic:0, lactic:1.8, tart:2.8, ci:1.44, ch:0.71, turb:0.8, temp:14.5, dens:0.9909, comment:'Assemblage bien intégré. Bouquet complexe.' },
    { lot:'ASS-2023-B19', ctn:'BAR-004', date:daysAgo(55), type:'standard', alcohol:14.0, rs:0.9, ta:5.5, va:0.38, ph:3.62, fso2:29, tso2:85, malic:0, lactic:1.7, tart:2.9, ci:1.42, ch:0.72, turb:1.2, temp:15.0, dens:0.9912, comment:'Première analyse post-assemblage. Conforme aux objectifs.' },
    // Biodynamique 2023
    { lot:'BIO-2023-B20', ctn:'BAR-002', date:daysAgo(6), type:'standard', alcohol:13.9, rs:1.0, ta:5.6, va:0.33, ph:3.57, fso2:20, tso2:55, malic:0, lactic:1.6, tart:3.0, ci:1.38, ch:0.74, turb:1.0, temp:15.0, dens:0.9915, comment:'SO2 total conforme certification. Profil bio pur.' },
    { lot:'BIO-2023-B20', ctn:'CB-01', date:daysAgo(85), type:'standard', alcohol:13.8, rs:1.1, ta:5.8, va:0.31, ph:3.55, fso2:18, tso2:50, malic:0.5, lactic:1.2, tart:3.1, ci:1.36, ch:0.75, turb:2.8, temp:16.0, dens:0.9920, comment:'FML presque terminée. Dernier point malique en décroissance.' },
    // Blend Classique 2023
    { lot:'BLK-2023-B05', ctn:'CIT-01', date:daysAgo(14), type:'standard', alcohol:13.5, rs:1.2, ta:5.6, va:0.44, ph:3.58, fso2:28, tso2:80, malic:0, lactic:1.7, tart:2.9, ci:1.30, ch:0.76, turb:0.5, temp:15.0, dens:0.9918, comment:'Contrôle pré-expédition. Tout est conforme.' },
    // Cabernet Parcelle A 2023
    { lot:'CAB-2023-B07', ctn:'BAR-001', date:daysAgo(22), type:'standard', alcohol:13.8, rs:0.9, ta:6.1, va:0.45, ph:3.42, fso2:25, tso2:75, malic:0, lactic:1.5, tart:3.2, ci:1.42, ch:0.73, turb:1.5, temp:15.0, dens:0.9914, comment:'Bonne évolution. Notes poivron vert en diminution.' },
    { lot:'CAB-2023-B07', ctn:'CI-03', date:daysAgo(55), type:'standard', alcohol:13.7, rs:1.0, ta:6.2, va:0.43, ph:3.41, fso2:24, tso2:73, malic:0, lactic:1.4, tart:3.3, ci:1.40, ch:0.74, turb:3.2, temp:16.0, dens:0.9916, comment:'Post-filtration. Légère montée turbidité à surveiller.' },
    // Merlot Bio 2024
    { lot:'MER-2024-B03', ctn:'CI-04', date:daysAgo(4), type:'standard', alcohol:13.2, rs:2.1, ta:5.9, va:0.32, ph:3.54, fso2:18, tso2:52, malic:1.2, lactic:0.6, tart:3.3, ci:1.65, ch:0.79, turb:2.2, temp:17.0, dens:0.9950, comment:'FML en cours. Progression normale. T° cave OK.' },
    { lot:'MER-2024-B03', ctn:'CB-02', date:daysAgo(25), type:'quick', alcohol:9.5, rs:32.0, ta:6.4, va:0.28, ph:3.49, fso2:14, tso2:44, malic:3.8, lactic:0, tart:3.8, ci:1.78, ch:0.84, turb:3.8, temp:22.0, dens:1.0480, comment:'Mi-fermentation. Extraction intense. Pigeages 2×/jour.' },
    // Rosé de Saignée 2024
    { lot:'ROSE-2024-B13', ctn:'CI-05', date:daysAgo(60), type:'standard', alcohol:12.8, rs:3.1, ta:6.5, va:0.28, ph:3.28, fso2:22, tso2:62, malic:0, lactic:0, tart:4.0, ci:null, ch:null, turb:0.8, temp:14.0, dens:0.9935, comment:'Post-filtration stabilisation. Couleur pêche préservée. Prêt mise.' },
    { lot:'ROSE-2024-B13', ctn:'CI-03', date:daysAgo(67), type:'quick', alcohol:12.6, rs:3.4, ta:6.6, va:0.26, ph:3.27, fso2:20, tso2:60, malic:0, lactic:0, tart:4.1, ci:null, ch:null, turb:14.5, temp:4.0, dens:0.9938, comment:'Pendant stabilisation à froid. Tartrates en précipitation.' },
    // Graves Blanc élevage barrique
    { lot:'GRAV-2024-B10', ctn:'BAR-003', date:daysAgo(21), type:'standard', alcohol:12.9, rs:2.8, ta:7.2, va:0.26, ph:3.18, fso2:26, tso2:70, malic:1.2, lactic:0.4, tart:4.6, ci:null, ch:null, turb:1.8, temp:14.5, dens:0.9933, comment:'Élevage barrique 30%. FML en démarrage. Bâtonnage 2×/semaine.' },
    // Sauvignon 2023
    { lot:'SAU-2023-B12', ctn:'CIT-01', date:daysAgo(8), type:'standard', alcohol:12.9, rs:1.9, ta:7.4, va:0.28, ph:3.22, fso2:28, tso2:72, malic:0, lactic:0, tart:4.2, ci:null, ch:null, turb:0.3, temp:14.0, dens:0.9934, comment:'Contrôle avant expédition vrac. Toutes valeurs conformes.' },
    // Muscadelle 2024
    { lot:'MUS-2024-B11', ctn:'CI-03', date:daysAgo(23), type:'standard', alcohol:12.3, rs:8.8, ta:6.9, va:0.25, ph:3.28, fso2:34, tso2:88, malic:0, lactic:0, tart:4.4, ci:null, ch:null, turb:1.2, temp:14.5, dens:0.9942, comment:'Sucres résiduels maîtrisés. Notes de miel et abricot. Parfait.' },
    // Petit Verdot 2024
    { lot:'PET-2024-B04', ctn:'CI-04', date:daysAgo(24), type:'standard', alcohol:14.3, rs:1.2, ta:6.9, va:0.38, ph:3.33, fso2:12, tso2:42, malic:2.8, lactic:0.2, tart:3.8, ci:2.10, ch:0.68, turb:4.2, temp:18.0, dens:0.9908, comment:'FML démarrée. Couleur très intense normale pour cépage. Tanins durs.' },
    // Crémant 2024
    { lot:'CREM-2024-B18', ctn:'CI-06', date:daysAgo(16), type:'standard', alcohol:11.0, rs:15.0, ta:8.4, va:0.22, ph:3.08, fso2:38, tso2:96, malic:0, lactic:0, tart:5.5, ci:null, ch:null, turb:1.5, temp:12.0, dens:0.9960, comment:'Cuvée tirage prête. Acide tartrique ajouté 1.5g/hL pour prise de mousse.' },
    // Malbec 2024 essai
    { lot:'MAL-2024-B16', ctn:'CB-01', date:daysAgo(46), type:'quick', alcohol:0, rs:null, ta:7.1, va:0.22, ph:3.38, fso2:10, tso2:32, malic:5.2, lactic:0, tart:4.2, ci:1.90, ch:0.85, turb:7.5, temp:20.0, dens:1.0875, comment:'Départ fermentation spontanée. Intéressant à suivre.' },
    // Carménère essai
    { lot:'CARB-2024-B17', ctn:'BAR-005', date:daysAgo(47), type:'quick', alcohol:0, rs:null, ta:6.8, va:0.28, ph:3.44, fso2:8, tso2:30, malic:4.9, lactic:0, tart:3.9, ci:2.05, ch:0.82, turb:8.1, temp:20.5, dens:1.0840, comment:'Micro-cuvée. Potentiel remarquable. Notes poivron vert-chocolat.' },
    // Analyses lab externe
    { lot:'GRV-2022-B08', ctn:'FDR-02', date:daysAgo(60), type:'external_lab', lab:'Laboratoire Parker Advisor', alcohol:14.3, rs:0.7, ta:5.3, va:0.46, ph:3.65, fso2:32, tso2:92, malic:0, lactic:2.0, tart:2.7, ci:1.56, ch:0.69, turb:0.5, temp:14.0, dens:0.9904, comment:'Note 97/100 Parker. "Exceptional vintage." Mise en marché premium préconisée.' },
    { lot:'RES-2023-B06', ctn:'BAR-002', date:daysAgo(60), type:'external_lab', lab:'Consulant Oenologique Derenoncourt', alcohol:14.1, rs:0.9, ta:5.4, va:0.40, ph:3.60, fso2:30, tso2:87, malic:0, lactic:1.8, tart:2.8, ci:1.47, ch:0.72, turb:0.8, temp:15.0, dens:0.9911, comment:'Validation Derenoncourt. Mise en bouteilles autorisée Q2 2025.' },
    { lot:'BIO-2023-B20', ctn:'CB-01', date:daysAgo(120), type:'external_lab', lab:'Ecocert Contrôle Bio', alcohol:13.5, rs:1.5, ta:6.0, va:0.29, ph:3.53, fso2:16, tso2:48, malic:1.8, lactic:0.5, tart:3.2, ci:1.32, ch:0.77, turb:4.2, temp:17.0, dens:0.9928, comment:'Certification bio confirmée. SO2 total 48 mg/L < 100 mg/L requis. VALIDÉ.' },
  ];

  let anaCount = 0;
  for (const a of analysesData) {
    try {
      await q(`
        INSERT INTO barbote_analyses (
          lot_id, container_id, analysis_date, analysis_type, lab_name,
          alcohol_percent, residual_sugar_gl, total_acidity_gl, volatile_acidity_gl,
          ph, free_so2_mgl, total_so2_mgl, malic_acid_gl, lactic_acid_gl,
          tartaric_acid_gl, color_intensity, color_hue, turbidity_ntu, temperature_c,
          density, comments, is_validated, validated_by, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      `, [
        lots[a.lot] || null, containers[a.ctn] || null, a.date, a.type, a.lab || null,
        a.alcohol, a.rs, a.ta, a.va, a.ph, a.fso2, a.tso2,
        a.malic, a.lactic, a.tart, a.ci, a.ch, a.turb, a.temp, a.dens,
        a.comment, true, oenoId, oenoId
      ]);
      anaCount++;
    } catch(e) {
      console.error(`  ⚠ Analyse ${a.lot}: ${e.message.slice(0,80)}`);
    }
  }
  console.log(`  ✓ ${anaCount} analyses créées`);

  // -------------------------------------------------------
  // 4. OPÉRATIONS EN MASSE (20 opérations récentes)
  // -------------------------------------------------------
  console.log('\n⚗️  Création de 20 opérations...');

  const opsData = [
    { type:'levurage', lot:'MRL-2024-B01', ctn:'CI-04', date:daysAgo(1), dose:15.0, vol:15000, temp:20.0,
      products:'[{"name":"Levures EC1118","quantity":0.22,"unit":"kg"}]',
      purpose:'Inoculation Merlot Terroir 2024', expected:'Départ fermentation 24h', actual:null, op:op1Id, status:'in_progress' },
    { type:'levurage', lot:'CS-2024-B02', ctn:'CB-01', date:daysAgo(2), dose:15.0, vol:8000, temp:17.5,
      products:'[{"name":"Levures BM45","quantity":0.12,"unit":"kg"}]',
      purpose:'Inoculation CS VV 2024 — profil aromatique', expected:'Fermentation lente et aromatique', actual:null, op:op2Id, status:'in_progress' },
    { type:'levurage', lot:'MER-2024-B03', ctn:'CB-02', date:daysAgo(25), dose:15.0, vol:6500, temp:18.0,
      products:'[{"name":"Levures Zymaflore X5","quantity":0.10,"unit":"kg"}]',
      purpose:'Levurage Merlot Bio — levures sans SO2', expected:'Fermentation propre basses doses SO2', actual:'Fermentation démarrée dans les 24h. Profil clean.', op:op2Id, status:'done' },
    { type:'sulfitage', lot:'GRAV-2024-B10', ctn:'CI-06', date:daysAgo(3), dose:7.0, vol:11000, temp:10.0,
      products:'[{"name":"SO2 liquide 6%","quantity":7.7,"unit":"g"}]',
      purpose:'Protection antioxydante blanc délicat', expected:'SO2 libre cible 30 mg/L', actual:'SO2 libre mesuré : 31 mg/L. Objectif atteint.', op:op1Id, status:'done' },
    { type:'sulfitage', lot:'BIO-2023-B20', ctn:'BAR-002', date:daysAgo(65), dose:3.0, vol:4300, temp:15.0,
      products:'[{"name":"Métabisulfite de potassium","quantity":1.3,"unit":"g"}]',
      purpose:'SO2 minimum cuvée biodynamique', expected:'SO2 total < 50 mg/L (certification)', actual:'SO2 total : 55 mg/L. Ajustement mineur nécessaire.', op:op2Id, status:'done' },
    { type:'malo', lot:'CS-2024-B02', ctn:'CB-01', date:daysAgo(2), dose:8.0, vol:8000, temp:20.0,
      products:'[{"name":"Bactéries Lalvin VP41","quantity":0.06,"unit":"kg"}]',
      purpose:'Déclenchement FML CS VV 2024', expected:'FML démarrée sous 7-10 jours', actual:null, op:oenoId, status:'in_progress' },
    { type:'malo', lot:'MRL-2024-B01', ctn:'CI-04', date:daysAgo(1), dose:7.5, vol:15000, temp:20.0,
      products:'[{"name":"Bactéries Lactoenos 450","quantity":0.11,"unit":"kg"}]',
      purpose:'FML Merlot Terroir 2024', expected:'FML complète sous 3-4 semaines', actual:null, op:oenoId, status:'planned' },
    { type:'collage', lot:'GRAV-2024-B10', ctn:'CI-06', date:daysAgo(21), dose:80.0, vol:7700, temp:12.0,
      products:'[{"name":"Bentonite sodique","quantity":0.62,"unit":"kg"}]',
      purpose:'Stabilisation protéique Graves Blanc', expected:'Test de chaleur négatif post-traitement', actual:'Test de chaleur négatif. Stabilité acquise.', op:op1Id, status:'done' },
    { type:'collage', lot:'RES-2023-B06', ctn:'BAR-001', date:daysAgo(62), dose:25.0, vol:12000, temp:14.5,
      products:'[{"name":"Gélatine porcine","quantity":0.30,"unit":"kg"},{"name":"Bentonite","quantity":3.0,"unit":"kg"}]',
      purpose:'Collage précis Réserve Signature — texture finale', expected:'Réduction astringence sans perte aromatique', actual:'Dégustation post-collage : texture veloutée. Note +0.5 pt.', op:op2Id, status:'done' },
    { type:'filtration', lot:'SAU-2023-B12', ctn:'CI-05', date:daysAgo(17), dose:null, vol:6800, temp:14.0,
      products:'[{"name":"Bentonite","quantity":0.54,"unit":"kg"}]',
      purpose:'Stabilisation protéique Sauvignon 2023', expected:'Test chaleur négatif avant expédition', actual:'Test OK. Turbidité 0.4 NTU.', op:op1Id, status:'done' },
    { type:'filtration', lot:'GRV-2022-B08', ctn:'FDR-02', date:daysAgo(9), dose:null, vol:9000, temp:14.0,
      products:'[{"name":"Plaques filtrantes EK","quantity":30.0,"unit":"plaques"}]',
      purpose:'Filtration stérilisante avant embouteillage Grande Réserve', expected:'Turbidité < 0.5 NTU, microbiologie négative', actual:'Turbidité 0.3 NTU. Microbiologie: RAS.', op:op1Id, status:'done' },
    { type:'batonnage', lot:'GRAV-2024-B10', ctn:'BAR-003', date:daysAgo(7), dose:null, vol:3300, temp:15.0,
      products:'[]',
      purpose:'Bâtonnage hebdomadaire lies fines Graves Blanc', expected:'Texture grasse, complexité aromatique', actual:'Vin prend de la rondeur. Arômes briochés en développement.', op:op2Id, status:'done' },
    { type:'batonnage', lot:'GRAV-2024-B10', ctn:'BAR-003', date:daysAgo(14), dose:null, vol:3300, temp:15.0,
      products:'[]',
      purpose:'Bâtonnage N°2', expected:'Enrichissement lies fines', actual:'Turbidité légèrement en hausse (normal). Notes vanillées.', op:op2Id, status:'done' },
    { type:'micro_oxygenation', lot:'CAB-2023-B07', ctn:'CI-03', date:daysAgo(55), dose:null, vol:9000, temp:18.0,
      products:'[]',
      purpose:'Micro-oxygénation Cabernet 2023 — fondre tanins', expected:'Réduction tanins verts. Couleur stable.', actual:'Tanins plus fondus. Notes végétales -40%. Dégustation positive.', op:oenoId, status:'done' },
    { type:'acidification', lot:'CREM-2024-B18', ctn:'CI-06', date:daysAgo(16), dose:150.0, vol:8000, temp:12.0,
      products:'[{"name":"Acide tartrique","quantity":1.2,"unit":"kg"}]',
      purpose:'Ajustement acidité Crémant avant tirage', expected:'pH cible 3.08 pour prise de mousse optimale', actual:'pH final 3.07. Conforme.', op:op1Id, status:'done' },
    { type:'chaptalisation', lot:'PET-2024-B04', ctn:'CI-04', date:daysAgo(24), dose:340.0, vol:3500, temp:20.0,
      products:'[{"name":"Sucre de betterave","quantity":11.9,"unit":"kg"}]',
      purpose:'Chaptalisation Petit Verdot — titre alcool insuffisant', expected:'+1° alcool naturel', actual:'Départ fermentation sucres ajoutés confirmé. +0.9° estimé.', op:op1Id, status:'done' },
    { type:'desacidification', lot:'MER-2024-B03', ctn:'CI-04', date:daysAgo(4), dose:null, vol:6500, temp:18.0,
      products:'[{"name":"Bicarbonate de potassium","quantity":0.65,"unit":"kg"}]',
      purpose:'Désacidification légère Merlot Bio 2024', expected:'Réduction TA de 6.4 à 5.9 g/L', actual:null, op:oenoId, status:'in_progress' },
    { type:'sulfitage', lot:'ASS-2023-B19', ctn:'BAR-004', date:daysAgo(7), dose:5.0, vol:5800, temp:14.5,
      products:'[{"name":"SO2 liquide 6%","quantity":2.9,"unit":"g"}]',
      purpose:'Maintien protection Assemblage Prestige', expected:'SO2 libre 30 mg/L', actual:'SO2 libre 31 mg/L. Parfait.', op:op1Id, status:'done' },
    { type:'levurage', lot:'CREM-2024-B18', ctn:'CI-06', date:daysAgo(16), dose:20.0, vol:8000, temp:12.0,
      products:'[{"name":"Levures EC1118 tirage","quantity":0.16,"unit":"kg"}]',
      purpose:'Levurage pour prise de mousse Crémant', expected:'2ème fermentation progressive 12°C', actual:'Prise de mousse démarrée J+3. Pression monte.', op:op2Id, status:'done' },
    { type:'autre', lot:'MAL-2024-B16', ctn:'CB-01', date:daysAgo(46), dose:null, vol:2500, temp:22.0,
      products:'[]',
      purpose:'Surveillance quotidienne micro-cuvée Malbec', expected:'Fermentation spontanée maîtrisée', actual:'Fermentation spontanée active. Flore indigène favorable.', op:oenoId, status:'done' },
  ];

  let opCount = 0;
  for (const op of opsData) {
    try {
      await q(`
        INSERT INTO barbote_operations (
          operation_type, lot_id, container_id, date,
          products_used, dose_per_hl, volume_treated_liters, temperature_c,
          purpose, expected_effect, actual_effect, operator_id, status
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13)
      `, [
        op.type, lots[op.lot] || null, containers[op.ctn] || null, op.date,
        op.products, op.dose, op.vol, op.temp,
        op.purpose, op.expected, op.actual, op.op, op.status
      ]);
      opCount++;
    } catch(e) {
      console.error(`  ⚠ Op ${op.type}/${op.lot}: ${e.message.slice(0,80)}`);
    }
  }
  console.log(`  ✓ ${opCount} opérations créées`);

  // -------------------------------------------------------
  // 5. CONVERSATIONS IA SUPPLÉMENTAIRES
  // -------------------------------------------------------
  console.log('\n💬 Création de 3 conversations IA supplémentaires...');

  const convInserts = [
    { user_id: adminId, title: 'Grande Réserve 2022 — Stratégie commerciale', type: 'general',
      msgs: [
        { role: 'user', content: 'Mon Grande Réserve 2022 a 97 pts Parker. Quel prix de vente recommandez-vous ?', tokens: 35 },
        { role: 'assistant', content: `Un score **97/100 Parker** place votre Grande Réserve 2022 dans une catégorie très sélective. Voici mon analyse prix :

**Benchmarks marché actuels (2024-2025) :**
- 95-96 pts Parker — Pauillac non-classé : 45-80€/bouteille
- 97-98 pts Parker — équivalent bon classé : 80-180€/bouteille
- 99-100 pts Parker — icônes mondiales : 200€+

**Pour votre Grande Réserve 2022 :**
Prix de vente recommandé : **95-130€ TTC caviste / 140-180€ restauration**

**Stratégie différenciée :**
- 30% allocation presse/dégustateurs (crédibilité)
- 40% cavistes premium FR + export Asie
- 20% direct domaine + mail list
- 10% enchères en primeur (maximise le prix unitaire)

**Timing :** Ne sortez pas trop tôt. Attendez le buzz post-notation (3-6 mois). La rareté fait le prix.`, tokens: 220 },
        { role: 'user', content: 'Combien de bouteilles au total devrais-je mettre en marché vs garder en cave ?', tokens: 30 },
        { role: 'assistant', content: `Pour optimiser **revenu immédiat ET valorisation à long terme**, voici ma répartition recommandée pour ~12 000 bouteilles (9 200L × ~1.3) :

| Destination | Quantité | Timing |
|---|---|---|
| Mise en marché immédiate | 5 000 cols | J+3 mois |
| Export Asie (HK, Tokyo) | 2 500 cols | J+4 mois |
| Primeurs amateurs | 1 000 cols | J+2 mois |
| **Cave du domaine (garde)** | **3 500 cols** | 5-10 ans |

Les 3 500 bouteilles en cave constituent votre **actif spéculatif** — un 97 pts Parker de 2022 en 2030 vaudra potentiellement 2-3× le prix actuel.

Référence : Pétrus 2000 (97 pts) : 300€ en primeur → 4 500€ aujourd'hui.`, tokens: 180 },
      ]
    },
    { user_id: oenoId, title: 'Certification Demeter — Questions SO2 lot BIO-2023', type: 'compliance',
      msgs: [
        { role: 'user', content: 'Quelles sont les limites SO2 pour la certification Demeter en vins rouges ?', tokens: 28 },
        { role: 'assistant', content: `Pour la certification **Demeter (biodynamique)**, les limites SO2 en vins rouges sont plus strictes que l'agriculture biologique standard :

**Limites SO2 total — Vins rouges Demeter :**
- Vins secs (SR < 2g/L) : **≤ 70 mg/L** SO2 total
- Vins demi-secs (SR 2-10g/L) : ≤ 90 mg/L
- Vins doux : ≤ 120 mg/L

**Comparaison :**
- AOC conventionnel rouge : 150 mg/L
- Certification AB (biologique) : 100 mg/L
- **Demeter : 70 mg/L** (le plus strict)

**Pour votre lot BIO-2023-B20 :**
Votre dernière analyse affiche 55 mg/L SO2 total → ✅ **Conforme Demeter**

Points de vigilance : Chaque sulfitage doit être documenté avec dose, date, lot. Registre Demeter obligatoire.`, tokens: 195 },
        { role: 'user', content: 'Est-ce qu\'on peut utiliser du bicarbonate de potassium pour désacidifier un vin bio ?', tokens: 25 },
        { role: 'assistant', content: `**Oui**, le bicarbonate de potassium (KHCO₃) est **autorisé en agriculture biologique et biodynamique** pour la désacidification.

**Réglementation UE :**
- Autorisé par Règlement (UE) 2019/934, Annexe I — liste des pratiques oenologiques autorisées en bio
- Dose max : 200 g/hL
- Effet : réduction acide tartrique → CO₂ + tartrate de potassium (précipitation naturelle)

**Pour votre Merlot Bio MER-2024-B03 :**
- Réduction AT estimée : -0.5 à -0.8 g/L par 100 g/hL KHCO₃
- Dose recommandée : 100 g/hL → de 6.4 à ~5.7 g/L AT
- À faire avant/pendant fermentation alcoolique pour meilleure efficacité

**Documentation requise :** Batch number, quantité exacte, date, lot traité → registre oenologique certifié.`, tokens: 210 },
      ]
    },
    { user_id: adminId, title: 'Crémant de Bordeaux — Optimisation prise de mousse', type: 'analysis',
      msgs: [
        { role: 'user', content: 'Notre Crémant 2024 est en prise de mousse depuis 3 semaines. Pression actuelle 3.5 bar à 12°C. Est-ce normal ?', tokens: 38 },
        { role: 'assistant', content: `**3.5 bar à 12°C** après 3 semaines : c'est dans la norme basse pour un Crémant.

**Rappel réglementaire AOC Crémant de Bordeaux :**
- Pression minimum : **3.5 bar à 20°C** pour l'appellation
- À 12°C, la pression est naturellement inférieure d'environ 0.8-1 bar → votre **3.5 bar à 12°C équivaut à ~4.3-4.5 bar à 20°C** ✅

**Votre situation :**
- 3 semaines → prise de mousse bien avancée
- pH 3.07 → bon (favorise la prise de mousse rapide)
- Sucres ajoutés : 24 g/L × 0.51 × CO₂ = ~4.1 bar attendus

**Durée minimum réglementaire :**
- Crémant AOC : **9 mois sur lies minimum** (fermentation + dépôt + dégorgement)
- Pour une qualité optimale : 12 mois recommandés

**Prochaine étape :** Contrôle pression dans 4 semaines puis dépôt en cave froide pour clarification naturelle.`, tokens: 240 },
      ]
    },
  ];

  for (const conv of convInserts) {
    const res = await q(`
      INSERT INTO barbote_conversations (user_id, title, context_type, context_ids, message_count, last_message_at)
      VALUES ($1,$2,$3,'{}',${conv.msgs.length},NOW() - interval '${randInt(1,10)} days')
      RETURNING id
    `, [conv.user_id, conv.title, conv.type]);
    const cid = res.rows[0].id;
    for (const msg of conv.msgs) {
      await q(`INSERT INTO barbote_messages (conversation_id, role, content, tokens_used, model) VALUES ($1,$2,$3,$4,'gpt-5-mini-2025-08-07')`,
        [cid, msg.role, msg.content, msg.tokens]);
    }
  }
  console.log('  ✓ 3 conversations IA créées');

  // -------------------------------------------------------
  // 6. NOTIFICATIONS SUPPLÉMENTAIRES
  // -------------------------------------------------------
  console.log('\n🔔 Création de 8 notifications supplémentaires...');

  const extraNotifs = [
    { user_id:adminId, type:'analysis_alert', title:'Fermentation active — CS VV 2024', message:'Densité CS-2024-B02 stable depuis 48h. Vérification recommandée.', data:{lot_id:lots['CS-2024-B02'],priority:'medium'}, read:false },
    { user_id:adminId, type:'lot_created', title:'Nouveau lot Malbec créé', message:'Lot MAL-2024-B16 (Malbec Essai) créé. Fermentation spontanée en cours.', data:{lot_id:lots['MAL-2024-B16'],priority:'low'}, read:false },
    { user_id:adminId, type:'assemblage_ready', title:'Grande Réserve 2022 — Prête embouteillage', message:'Toutes analyses validées. Prise de rendez-vous embouteillage recommandée.', data:{lot_id:lots['GRV-2022-B08'],priority:'high'}, read:false },
    { user_id:oenoId, type:'analysis_alert', title:'SO2 bas — Biodynamique 2023', message:'SO2 libre lot BIO-2023-B20 : 20 mg/L. Risque oxydation si ≥ 18h exposition.', data:{lot_id:lots['BIO-2023-B20'],priority:'high'}, read:false },
    { user_id:oenoId, type:'movement_validated', title:'Filtration Sauvignon 2023 terminée', message:'Filtration stérilisante SAU-2023-B12 validée. Turbidité finale 0.3 NTU.', data:{priority:'low'}, read:true },
    { user_id:op1Id, type:'maintenance_due', title:'Calibration thermomètres caves — Rappel', message:"Calibration sondes CI-05, CI-06 planifiée au 01/02/2025. Étalons COFRAC à préparer.", data:{priority:'medium'}, read:false },
    { user_id:adminId, type:'system', title:'Crémant — Prise de mousse confirmée', message:'CREM-2024-B18 atteint 3.5 bar (12°C) après 3 semaines. Conforme aux attentes.', data:{lot_id:lots['CREM-2024-B18'],priority:'low'}, read:true },
    { user_id:oenoId, type:'analysis_alert', title:'Analyse requise — Malbec Essai 2024', message:'Lot MAL-2024-B16 sans analyse depuis 10 jours. Suivi fermentation nécessaire.', data:{lot_id:lots['MAL-2024-B16'],priority:'medium'}, read:false },
  ];

  for (const n of extraNotifs) {
    await q(`INSERT INTO barbote_notifications (user_id, type, title, message, data, read) VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
      [n.user_id, n.type, n.title, n.message, JSON.stringify(n.data), n.read]);
  }
  console.log('  ✓ 8 notifications créées');

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
      (SELECT COUNT(*) FROM barbote_notifications)    AS notifications
  `);

  const c = counts.rows[0];
  console.log('\n✅ SEED DÉMO BOOST terminé!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('  CHÂTEAU MARCELOT — Base de démo complète');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  👤 Utilisateurs      : ${c.users}`);
  console.log(`  🛢️  Contenants        : ${c.containers}`);
  console.log(`  🍇 Lots de vin       : ${c.lots}`);
  console.log(`  🔄 Mouvements        : ${c.movements}`);
  console.log(`  🔬 Analyses          : ${c.analyses}`);
  console.log(`  ⚗️  Opérations        : ${c.operations}`);
  console.log(`  🤖 Plans assemblage  : ${c.assemblage_plans}`);
  console.log(`  🔧 Maintenances      : ${c.maintenance}`);
  console.log(`  💬 Conversations IA  : ${c.conversations} (${c.messages} messages)`);
  console.log(`  🔔 Notifications     : ${c.notifications}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('\n📋 Compte de test :');
  console.log('  admin@barbote.local  → admin123');
  console.log('  admin@chateau-marcelot.fr → Admin2024!');

  await pool.end();
}

seed().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
