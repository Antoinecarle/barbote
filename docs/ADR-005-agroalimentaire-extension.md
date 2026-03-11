# ADR-005: Extension Agroalimentaire — Préparation & Stratégie

**Date:** 2026-03-11
**Status:** Planned (Sprint 3+)

## Contexte

Barbote est conçu pour la traçabilité viticole mais son modèle de données est suffisamment générique pour s'adapter à d'autres filières agroalimentaires (fromagerie, brasserie, distillerie, cidre, etc.).

## Décision

### Stratégie d'extension

Plutôt que de créer une application séparée, paramétrer Barbote pour supporter d'autres filières via :

1. **Nomenclatures configurables** — Les types de lots, d'opérations et de paramètres d'analyse varient par filière
2. **Templates de données** — Schémas de paramètres analytiques pré-configurés par filière
3. **UI adaptative** — Labels et libellés configurables (ex. "lot" → "fromage" / "bière")

### Plan d'implémentation (Sprint 3)

#### Phase A: Table de configuration par filière

```sql
CREATE TABLE barbote_industry_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  industry_key VARCHAR(50) UNIQUE NOT NULL, -- 'wine', 'beer', 'cheese', 'cider', 'spirits'
  display_name VARCHAR(255) NOT NULL,
  lot_label VARCHAR(100) DEFAULT 'Lot',        -- "Fromage", "Bière", "Cuvée"
  container_types JSONB,                        -- Types de contenants spécifiques
  operation_types JSONB,                        -- Types d'opérations spécifiques
  analysis_params JSONB,                        -- Paramètres analytiques par défaut
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Phase B: Templates analytiques pré-configurés

| Filière | Paramètres clés |
|---|---|
| Vin (existant) | Alcool, AT, AV, pH, SO₂, sucres résiduels |
| Bière | IBU, EBC/SRM, densité OG/FG, ABV, CO₂ |
| Fromage | pH, humidité, Aw, matière grasse, extrait sec |
| Cidre | Pression, alcool, sucres, acidité totale, CO₂ |
| Spiritueux | Alcool, congénères, méthanol, densité |

#### Phase C: Labels configurables en frontend

```typescript
// src/lib/industry-config.ts
export const industryConfig = {
  wine: { lotLabel: 'Lot', containerLabel: 'Contenant', ...frLabels },
  beer: { lotLabel: 'Lot de bière', containerLabel: 'Cuve', ...beerLabels },
  cheese: { lotLabel: 'Fromage', containerLabel: 'Cave', ...cheeseLabels },
};
```

### Contraintes & Impact

- Pas de modification du schéma core existant (backward compatible)
- Ajout de colonnes `industry_key` sur `barbote_lots` et `barbote_containers`
- Tous les modèles partagés (mouvements, analyses, assemblages) restent génériques
- L'IA doit être paramétrée avec des prompts filière-spécifiques

### Prérequis avant Extension

- [ ] Tests unitaires backend > 60% coverage
- [ ] Multi-utilisateurs implémentés (US-020)
- [ ] API publique documentée (US-029)
- [ ] Performance validée sur jeux de données > 10K lots

## Conséquences

- Positives: Marché adressable x5, réutilisation maximale du code
- Négatives: Complexité accrue de la configuration, besoin de UX générique
- Risques: Dilution du focus MVP vin si démarré trop tôt
