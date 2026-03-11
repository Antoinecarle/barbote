# ADR-003: Stratégie de Delivery — Branching, Versioning & Release

**Date:** 2026-03-11
**Status:** Accepted
**Deciders:** Équipe Barbote

## Contexte

Définir la stratégie de delivery pour assurer des releases stables, traçables et reproductibles sur tous les environnements.

## Décision

### Stratégie de Branches (Trunk-based avec feature flags)

```
main ──────────────────────────────────── production (auto-deploy Railway)
  └── develop ──────────────────────────── staging
        ├── feat/US-017-export-pdf
        ├── feat/US-018-import-excel
        └── fix/US-022-mobile-responsive
```

**Règles:**
- `main` → déploiement prod automatique via Railway (git push → deploy)
- `develop` → déploiement staging automatique
- Feature branches: `feat/US-XXX-description` ou `fix/description`
- PRs obligatoires vers `develop`, pas de push direct sur `main`
- Merge `develop → main` = release officielle

### Conventions de Commits (Conventional Commits)

Format: `type(scope): description`

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `ci`, `chore`
Scopes: `auth`, `lots`, `movements`, `analyses`, `assemblage`, `ai`, `maintenance`, `ci`, `db`, `frontend`

Exemples:
```
feat(assemblage): add Excel export for assemblage scenarios
fix(ai): handle OpenAI timeout with fallback response
test(lots): add unit tests for volume balance invariant
```

### Versioning (Semantic Versioning)

Format: `MAJOR.MINOR.PATCH`
- `MAJOR`: Breaking change (ex: nouvelle version API)
- `MINOR`: Nouvelle feature non-breaking
- `PATCH`: Bug fix

Version actuelle: `1.0.0` (MVP stable)
Prochaine release: `1.1.0` (Sprint 2 features)

### Cadence de Release

| Phase | Fréquence | Trigger |
|---|---|---|
| Dev | Continu | Push sur `develop` |
| Staging | Automatique | Push sur `develop` |
| Production | Hebdomadaire | Merge `develop → main` |
| Hotfix | À la demande | Branche `hotfix/xxx` |

### Plan d'Environnements

| Env | Branch | URL | DB | Données |
|---|---|---|---|---|
| Local | feature/* | localhost:5173 | PostgreSQL Railway | Seed demo |
| Staging | develop | staging.barbote.app | Railway (staging DB) | Anonymisées |
| Production | main | barbote.app / Railway | Railway (prod DB) | Réelles |

### Definition of Ready (DoR)

- [ ] User story décrite avec critères d'acceptation
- [ ] Estimée en points (1/2/3/5/8)
- [ ] Maquette disponible si composant visuel (via Gemini Design)
- [ ] Dépendances DB identifiées (migration nécessaire ?)
- [ ] Cas de test définis

### Definition of Done (DoD)

- [ ] Code revu (PR approuvée)
- [ ] Types TypeScript corrects (tsc --noEmit passe)
- [ ] Tests backend passent (npm test)
- [ ] Build frontend réussi (npm run build)
- [ ] Déployé sur staging et validé manuellement
- [ ] Performance < 500ms sur endpoints critiques
- [ ] Pas de régression sur features existantes
- [ ] Audit trail créé pour opérations sensibles

### Métriques de Qualité

| Métrique | Seuil | Outil |
|---|---|---|
| Couverture tests backend | > 60% | Jest |
| Temps CI pipeline | < 5 min | GitHub Actions |
| Lighthouse score | > 80 | lighthouse-ci |
| npm audit | 0 high/critical | npm audit |
| TypeScript errors | 0 | tsc --noEmit |

## Conséquences

- Positives: Déploiement prévisible, traçabilité des changements, rollback facile
- Négatives: Overhead légèrement plus élevé pour les petites équipes
- Risques: Dérive entre `develop` et `main` si release trop espacées
