# Barbote — Dictionnaire de Données

**Version:** 1.1.0
**Date:** 2026-03-11
**Scope:** Schéma PostgreSQL `barbote_*`

---

## Table: `barbote_lots`

Unité de traçabilité centrale. Représente un lot de vin (batch) à un instant donné.

| Colonne | Type | Contrainte | Description | Exemple |
|---|---|---|---|---|
| `id` | UUID | PK | Identifiant unique | `550e8400-e29b-41d4-a716-446655440000` |
| `lot_number` | VARCHAR(100) | UNIQUE NOT NULL | Code lot unique lisible | `LOT-2024-001`, `R-MER-2023-A` |
| `name` | VARCHAR(255) | NOT NULL | Nom descriptif | `Merlot Saint-Émilion 2023` |
| `type` | VARCHAR(100) | ENUM | Couleur du vin | `rouge`, `blanc`, `rose`, `petillant`, `mousseux`, `muté`, `autre` |
| `appellation` | VARCHAR(255) | nullable | AOC/IGP | `Saint-Émilion Grand Cru` |
| `vintage_year` | INTEGER | nullable | Millésime | `2023` |
| `grape_varieties` | JSONB | default `[]` | Cépages et pourcentages | `[{"variety":"Merlot","percentage":80},{"variety":"Cabernet","percentage":20}]` |
| `initial_volume_liters` | DECIMAL(12,2) | NOT NULL | Volume lors de la création | `10000.00` |
| `current_volume_liters` | DECIMAL(12,2) | NOT NULL | Volume actuel (mis à jour par mouvements) | `9500.00` |
| `status` | VARCHAR(50) | ENUM | État du lot | `active`, `bottled`, `sold`, `archived`, `spoiled` |
| `origin_lot_ids` | UUID[] | default `{}` | IDs des lots parents directs | `{uuid1, uuid2}` |
| `parent_lots` | JSONB | default `[]` | Détails des assemblages parents | `[{"lot_id":"uuid","percentage":60,"volume":6000}]` |
| `analysis_matrix` | JSONB | default `{}` | Dernière analyse consolidée | `{"alcohol_percent":13.5,"ph":3.45}` |
| `quality_score` | DECIMAL(5,2) | nullable | Score qualité 0-100 | `87.50` |
| `harvest_date` | DATE | nullable | Date de récolte | `2023-09-15` |
| `notes` | TEXT | nullable | Notes libres du vinificateur | |
| `metadata` | JSONB | default `{}` | Données extensibles | |
| `created_by` | UUID | FK → barbote_users | Créateur | |
| `created_at` | TIMESTAMPTZ | NOT NULL | Date de création | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Date de dernière modification | |

**Invariants:**
- `current_volume_liters` doit être calculé à partir des mouvements (jamais mis à jour manuellement sans mouvement associé)
- `lot_number` immuable après création
- Tout assemblage crée un nouveau lot avec `parent_lots` rempli
- `status = 'archived'` est irréversible

---

## Table: `barbote_movements`

Append-only. Représente toute variation de volume ou opération sur un lot.

| Colonne | Type | Description | Règles |
|---|---|---|---|
| `movement_type` | ENUM | Type d'opération | Voir liste ci-dessous |
| `lot_id` | UUID FK | Lot concerné | Obligatoire sauf type `assemblage` |
| `from_container_id` | UUID FK | Contenant source | nullable si entrée externe |
| `to_container_id` | UUID FK | Contenant destination | nullable si sortie définitive |
| `volume_liters` | DECIMAL(12,2) | Volume déplacé/traité | > 0 obligatoire |
| `source_lots` | JSONB | Lots sources pour assemblage | `[{"lot_id":"uuid","volume":5000,"percentage":50}]` |
| `target_lot_id` | UUID FK | Nouveau lot créé par assemblage | Rempli si `movement_type = 'assemblage'` |
| `inputs` | JSONB | Intrants utilisés | `[{"product":"SO2","quantity":5,"unit":"g/hL"}]` |
| `volume_loss_liters` | DECIMAL(12,2) | Pertes (lies, lies de filtration, etc.) | default 0 |
| `validated` | BOOLEAN | Validation oenologue | Requis pour certaines opérations |
| `validated_by` | UUID FK | Oenologue validateur | |
| `pre_analysis` | JSONB | Analyses avant opération | Snapshot |
| `post_analysis` | JSONB | Analyses après opération | Snapshot |

**Types de mouvement:**
| Type | Description | Bilan volume lot |
|---|---|---|
| `entree` | Arrivée de vin (vendange, achat) | + volume |
| `sortie` | Départ définitif (vente, dispatch) | - volume |
| `transfert` | Changement de contenant | neutre |
| `assemblage` | Mélange de lots → nouveau lot | - volumes sources, + nouveau lot |
| `soutirage` | Décantation avec perte | - perte |
| `filtration` | Filtration avec perte | - perte |
| `collage` | Clarification | traitement + légère perte |
| `perte` | Évaporation, coulage | - volume |
| `bottling` | Mise en bouteilles | - volume |
| `sulfitage` | Ajout SO2 | traitement (volume neutre) |
| `levurage` | Ajout levures | traitement |
| `malo` | Fermentation malolactique | traitement |

---

## Table: `barbote_analyses`

Paramètres analytiques d'un lot à une date donnée.

| Paramètre | Unité | Norme AOC rouge | Seuil alerte |
|---|---|---|---|
| `alcohol_percent` | % vol | 11-15% | < 9% ou > 15.5% |
| `total_acidity_gl` | g/L H₂SO₄ | 3.5-7 | > 8 |
| `volatile_acidity_gl` | g/L acétique | < 0.6 rouge | > 0.6 (ALERTE) |
| `ph` | — | 3.2-3.8 | < 3.0 ou > 4.0 |
| `free_so2_mgl` | mg/L | 20-35 libre | < 15 (ALERTE SO₂ BAS) |
| `total_so2_mgl` | mg/L | < 150 rouge | > 200 (limite légale) |
| `residual_sugar_gl` | g/L | < 2 sec | > 4 → demi-sec |
| `malic_acid_gl` | g/L | 0-3 | > 3 → FML incomplète |
| `lactic_acid_gl` | g/L | 0-2 | > 2 → problème |
| `density` | g/mL | 0.990-1.010 | hors range |
| `turbidity_ntu` | NTU | < 100 | > 200 (limpidité insuffisante) |

**Calcul matrice assemblage (pondération volumétrique):**
```
param_assemblage = Σ(param_lot_i × volume_lot_i) / Σ(volume_lot_i)
```
Exception: `volatile_acidity_gl` prend la valeur max des lots sources (non moyennée).

---

## Table: `barbote_audit_log`

Journal immuable de toutes les modifications critiques.

| Colonne | Description |
|---|---|
| `table_name` | Table modifiée |
| `record_id` | UUID de la ligne modifiée |
| `action` | `INSERT`, `UPDATE`, `DELETE` |
| `old_data` | JSONB snapshot avant (NULL pour INSERT) |
| `new_data` | JSONB snapshot après (NULL pour DELETE) |
| `user_id` | Utilisateur responsable |
| `user_email` | Email (dénormalisé pour auditabilité si user supprimé) |
| `ip_address` | IP de la requête |

**Tables auditées:** `barbote_lots`, `barbote_movements`, `barbote_analyses`, `barbote_operations`, `barbote_assemblage_plans`

---

## Règles de Cohérence (Invariants)

1. **Bilan volumique:** Pour tout lot, `current_volume = initial_volume + Σ(mouvements +) - Σ(mouvements -)` doit être vrai
2. **Traçabilité d'assemblage:** Tout nouveau lot créé par assemblage DOIT avoir `parent_lots` non vide
3. **Conformité SO₂:** `total_so2_mgl` ne peut jamais dépasser 200 mg/L (limite légale rouge sec)
4. **Contenants:** Un contenant ne peut pas être `in_use` avec `current_volume > capacity`
5. **Unicité lot_number:** Irréfutable via contrainte UNIQUE en DB
6. **Mouvements validés:** Opérations `sulfitage`, `chaptalisation`, `acidification` nécessitent `validated = true` pour être définitives
