# ADR-002: Modèle de Traçabilité

**Date:** 2026-03-11
**Status:** Accepted

## Décision

### Entités principales

1. **Lots** (`barbote_lots`) - Unité de traçabilité centrale
   - Chaque lot a un `lot_number` unique
   - Propriété `parent_lots` (JSONB) pour tracer l'origine des assemblages
   - `origin_lot_ids` (UUID array) pour requêtes rapides
   - Arbre de traçabilité récursif via `GET /lots/:id/traceability`

2. **Contenants** (`barbote_containers`) - Où est stocké le vin
   - Lien lot↔contenant via `barbote_lot_containers` (historisé)
   - `is_current` pour le contenant actuel

3. **Mouvements** (`barbote_movements`) - Toute opération de volume
   - Types: entree, sortie, transfert, assemblage, perte, etc.
   - Audit trail immuable

4. **Analyses** (`barbote_analyses`) - Paramètres analytiques
   - 20+ paramètres standards (alcool, AT, AV, pH, SO₂, etc.)
   - Calcul de matrice d'assemblage pondéré

### Invariants de cohérence

- Bilan volumique: `sum(entrées) - sum(sorties+pertes) = volume_actuel`
- Unicité lot_number
- Traçabilité parent: tout assemblage référence ses lots sources
- Audit trail: toute modification est journalisée

### Stratégie d'historisation

- Mouvements: append-only (jamais de UPDATE/DELETE)
- Lot containers: `is_current = false` lors d'un départ
- Corrections via mouvement de type 'correction' (pas d'overwrite)
