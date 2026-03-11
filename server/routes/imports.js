/**
 * Barbote Import Routes — Excel/CSV import for lots (module négociants)
 *
 * POST /api/imports/lots - Import lots from Excel/CSV
 * GET  /api/imports/template - Download import template
 * POST /api/imports/validate - Validate import before committing
 */

import express from 'express';
import multer from 'multer';
import { query } from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Multer config — store in memory (max 10MB for Excel files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez .xlsx, .xls ou .csv'));
    }
  },
});

// ─── Column mapping config ────────────────────────────────────────────────────

/**
 * Maps Excel column headers to DB fields
 * Supports French and English column names
 */
const COLUMN_MAP: Record<string, string> = {
  // French headers
  'numéro lot': 'lot_number',
  'numero lot': 'lot_number',
  'n° lot': 'lot_number',
  'lot': 'lot_number',
  'nom': 'name',
  'type': 'type',
  'couleur': 'type',
  'appellation': 'appellation',
  'aoc': 'appellation',
  'igp': 'appellation',
  'millésime': 'vintage_year',
  'millesime': 'vintage_year',
  'année': 'vintage_year',
  'annee': 'vintage_year',
  'volume initial': 'initial_volume_liters',
  'volume': 'initial_volume_liters',
  'volume (l)': 'initial_volume_liters',
  'volume litres': 'initial_volume_liters',
  'cépage': 'grape_varieties_raw',
  'cepage': 'grape_varieties_raw',
  'cépages': 'grape_varieties_raw',
  'notes': 'notes',
  'remarques': 'notes',
  // English headers
  'lot number': 'lot_number',
  'batch': 'lot_number',
  'wine type': 'type',
  'vintage': 'vintage_year',
  'initial volume': 'initial_volume_liters',
  'grape variety': 'grape_varieties_raw',
};

const WINE_TYPES: Record<string, string> = {
  'rouge': 'rouge', 'red': 'rouge', 'r': 'rouge',
  'blanc': 'blanc', 'white': 'blanc', 'b': 'blanc',
  'rosé': 'rose', 'rose': 'rose', 'pink': 'rose',
  'pétillant': 'petillant', 'petillant': 'petillant', 'sparkling': 'petillant',
  'mousseux': 'mousseux', 'champagne': 'mousseux',
  'muté': 'muté', 'mute': 'muté', 'fortified': 'muté',
};

// ─── CSV parser (no dependencies needed) ─────────────────────────────────────

function parseCSV(buffer: Buffer): Array<Record<string, string>> {
  const text = buffer.toString('utf-8');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    });
}

// ─── XLSX parser (using xlsx library if available, fallback to CSV) ───────────

async function parseExcel(buffer: Buffer, filename: string): Promise<Array<Record<string, string>>> {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.csv') {
    return parseCSV(buffer);
  }

  // Try to use xlsx library
  try {
    const XLSX = await import('xlsx').catch(() => null);
    if (!XLSX) {
      throw new Error('Module xlsx non disponible. Utilisez le format CSV.');
    }
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][];

    if (rows.length < 2) return [];

    const headers = rows[0].map((h: any) => String(h).trim().toLowerCase());
    return rows.slice(1)
      .filter((row: any[]) => row.some((cell: any) => cell != null && String(cell).trim()))
      .map((row: any[]) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = row[i] != null ? String(row[i]).trim() : ''; });
        return obj;
      });
  } catch (err) {
    if (ext === '.xlsx' || ext === '.xls') {
      throw new Error('Impossible de lire le fichier Excel. Essayez d\'exporter en CSV depuis Excel.');
    }
    throw err;
  }
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

interface MappedRow {
  lot_number?: string;
  name?: string;
  type?: string;
  appellation?: string;
  vintage_year?: number;
  initial_volume_liters?: number;
  grape_varieties?: Array<{ variety: string; percentage: number }>;
  notes?: string;
  errors: string[];
  warnings: string[];
  row_index: number;
}

function mapRow(rawRow: Record<string, string>, rowIndex: number): MappedRow {
  const mapped: MappedRow = { errors: [], warnings: [], row_index: rowIndex };

  // Map columns
  for (const [rawKey, rawValue] of Object.entries(rawRow)) {
    const dbField = COLUMN_MAP[rawKey.toLowerCase().trim()];
    if (!dbField || !rawValue) continue;

    if (dbField === 'lot_number') mapped.lot_number = rawValue.trim();
    else if (dbField === 'name') mapped.name = rawValue.trim();
    else if (dbField === 'appellation') mapped.appellation = rawValue.trim() || undefined;
    else if (dbField === 'notes') mapped.notes = rawValue.trim() || undefined;
    else if (dbField === 'type') {
      const t = WINE_TYPES[rawValue.toLowerCase().trim()];
      mapped.type = t || 'autre';
      if (!t) mapped.warnings.push(`Type "${rawValue}" non reconnu, défini à "autre"`);
    }
    else if (dbField === 'vintage_year') {
      const y = parseInt(rawValue);
      if (isNaN(y) || y < 1900 || y > new Date().getFullYear() + 1) {
        mapped.warnings.push(`Millésime "${rawValue}" invalide, ignoré`);
      } else {
        mapped.vintage_year = y;
      }
    }
    else if (dbField === 'initial_volume_liters') {
      const v = parseFloat(rawValue.replace(',', '.').replace(/[^0-9.]/g, ''));
      if (isNaN(v) || v <= 0) {
        mapped.errors.push(`Volume "${rawValue}" invalide`);
      } else {
        mapped.initial_volume_liters = v;
      }
    }
    else if (dbField === 'grape_varieties_raw') {
      // Parse "Merlot 80%, Cabernet 20%" or "Merlot" or "Merlot:80;Cabernet:20"
      const varieties: Array<{ variety: string; percentage: number }> = [];
      const parts = rawValue.split(/[;,]/).map(p => p.trim()).filter(Boolean);
      let totalPct = 0;

      for (const part of parts) {
        const match = part.match(/^([a-zA-ZÀ-ÿ\s]+?)[\s:]+(\d+(?:[.,]\d+)?)\s*%?$/);
        if (match) {
          const pct = parseFloat(match[2]);
          varieties.push({ variety: match[1].trim(), percentage: pct });
          totalPct += pct;
        } else {
          // Just a variety name, no percentage
          varieties.push({ variety: part.replace(/\d+%?/g, '').trim(), percentage: 0 });
        }
      }

      if (totalPct > 0 && Math.abs(totalPct - 100) > 5) {
        mapped.warnings.push(`Cépages: total ${totalPct}% ≠ 100%`);
      }
      if (varieties.length > 0) mapped.grape_varieties = varieties;
    }
  }

  // Validation
  if (!mapped.lot_number) mapped.errors.push('Numéro de lot manquant');
  if (!mapped.name) {
    if (mapped.lot_number) mapped.name = mapped.lot_number; // fallback to lot_number
    else mapped.errors.push('Nom manquant');
  }
  if (!mapped.type) { mapped.type = 'autre'; mapped.warnings.push('Type de vin non spécifié, défini à "autre"'); }
  if (!mapped.initial_volume_liters) mapped.errors.push('Volume initial manquant ou invalide');

  return mapped;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/imports/validate — Validate without inserting
router.post('/validate', verifyToken, upload.single('file'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

  try {
    const rows = await parseExcel(req.file.buffer, req.file.originalname);
    if (rows.length === 0) return res.status(400).json({ error: 'Le fichier est vide ou non lisible' });

    const mapped = rows.map((row, i) => mapRow(row, i + 2)); // row_index = Excel line number (1=header, 2=first data)

    // Check for duplicate lot_numbers within the file
    const lotNumbers = mapped.filter(r => r.lot_number).map(r => r.lot_number!);
    const duplicatesInFile = lotNumbers.filter((n, i) => lotNumbers.indexOf(n) !== i);
    if (duplicatesInFile.length > 0) {
      mapped.forEach(r => {
        if (r.lot_number && duplicatesInFile.includes(r.lot_number)) {
          r.errors.push(`Numéro de lot "${r.lot_number}" en doublon dans le fichier`);
        }
      });
    }

    // Check existing lot_numbers in DB
    const existingRes = await query(
      'SELECT lot_number FROM barbote_lots WHERE lot_number = ANY($1)',
      [lotNumbers]
    );
    const existingNums = existingRes.rows.map(r => r.lot_number);
    mapped.forEach(r => {
      if (r.lot_number && existingNums.includes(r.lot_number)) {
        r.errors.push(`Lot "${r.lot_number}" existe déjà en base`);
      }
    });

    const valid = mapped.filter(r => r.errors.length === 0);
    const invalid = mapped.filter(r => r.errors.length > 0);

    res.json({
      total_rows: rows.length,
      valid_count: valid.length,
      invalid_count: invalid.length,
      rows: mapped.map(r => ({
        row_index: r.row_index,
        lot_number: r.lot_number,
        name: r.name,
        type: r.type,
        vintage_year: r.vintage_year,
        initial_volume_liters: r.initial_volume_liters,
        errors: r.errors,
        warnings: r.warnings,
      })),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/imports/lots — Import lots from Excel/CSV
router.post('/lots', verifyToken, upload.single('file'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

  const { skip_errors = 'false', dry_run = 'false' } = req.query;
  const isDryRun = dry_run === 'true';

  try {
    const rows = await parseExcel(req.file.buffer, req.file.originalname);
    if (rows.length === 0) return res.status(400).json({ error: 'Fichier vide' });

    const mapped = rows.map((row, i) => mapRow(row, i + 2));
    const toInsert = skip_errors === 'true'
      ? mapped.filter(r => r.errors.length === 0)
      : mapped;

    const hasBlockingErrors = toInsert.some(r => r.errors.length > 0);
    if (hasBlockingErrors && skip_errors !== 'true') {
      return res.status(422).json({
        error: 'Des erreurs bloquantes ont été trouvées. Utilisez skip_errors=true pour ignorer les lignes invalides.',
        invalid_rows: toInsert.filter(r => r.errors.length > 0).map(r => ({
          row_index: r.row_index,
          lot_number: r.lot_number,
          errors: r.errors,
        })),
      });
    }

    const validRows = toInsert.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
      return res.status(422).json({ error: 'Aucune ligne valide à importer' });
    }

    if (isDryRun) {
      return res.json({
        dry_run: true,
        would_insert: validRows.length,
        skipped: mapped.length - validRows.length,
        rows: validRows.map(r => ({ lot_number: r.lot_number, name: r.name, warnings: r.warnings })),
      });
    }

    // Insert valid rows
    const inserted: string[] = [];
    const skipped: Array<{ lot_number: string; reason: string }> = [];

    for (const row of validRows) {
      try {
        await query(
          `INSERT INTO barbote_lots
           (lot_number, name, type, appellation, vintage_year, initial_volume_liters, current_volume_liters,
            grape_varieties, notes, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, 'active', $9)`,
          [
            row.lot_number,
            row.name,
            row.type,
            row.appellation || null,
            row.vintage_year || null,
            row.initial_volume_liters,
            JSON.stringify(row.grape_varieties || []),
            row.notes || null,
            req.user.id,
          ]
        );
        inserted.push(row.lot_number!);
      } catch (dbErr: any) {
        skipped.push({ lot_number: row.lot_number!, reason: dbErr.message });
      }
    }

    res.json({
      success: true,
      inserted_count: inserted.length,
      skipped_count: skipped.length + (mapped.length - validRows.length),
      inserted_lots: inserted,
      skipped_details: skipped,
      warnings: validRows.flatMap(r => r.warnings.map(w => `Lot ${r.lot_number}: ${w}`)),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/imports/template — Download CSV template
router.get('/template', verifyToken, (req: any, res: any) => {
  const headers = [
    'N° Lot', 'Nom', 'Type', 'Appellation', 'Millésime',
    'Volume (L)', 'Cépages', 'Notes'
  ];
  const exampleRow = [
    'LOT-2024-001', 'Merlot Prestige', 'rouge', 'Saint-Émilion Grand Cru',
    '2024', '10000', 'Merlot:80%;Cabernet Franc:20%', 'Belle couleur rubis'
  ];
  const csvContent = [
    headers.join(';'),
    exampleRow.join(';'),
    ['LOT-2024-002', 'Blanc Sec Sauvignon', 'blanc', 'Bordeaux', '2024', '5000', 'Sauvignon Blanc:100%', ''].join(';'),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="barbote-import-template.csv"');
  res.send('\uFEFF' + csvContent); // BOM for Excel French compatibility
});

export default router;
