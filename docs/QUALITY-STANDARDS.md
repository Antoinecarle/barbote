# Barbote — Standards d'Ingénierie Logicielle

**Version:** 1.0.0
**Date:** 2026-03-11

---

## 1. Standards de Code

### Conventions de commits (Conventional Commits)

```
type(scope): description

Types: feat, fix, docs, test, refactor, perf, ci, chore
Scopes: auth, lots, movements, analyses, assemblage, ai, maintenance, ci, db, frontend
```

### Style de code

| Langage | Outil | Config |
|---|---|---|
| TypeScript (frontend) | ESLint + TypeScript | `frontend/tsconfig.json` |
| JavaScript (backend) | ESLint | `server/.eslintrc.json` |
| CSS | Tailwind CSS conventions | `frontend/tailwind.config.js` |

### Pull Request checklist

- [ ] Titre suit Conventional Commits
- [ ] TypeScript type check passe (`tsc --noEmit`)
- [ ] Build frontend réussit
- [ ] Tests backend passent (`npm test`)
- [ ] Pas de secret hardcodé dans le code
- [ ] API endpoint documenté dans le code (commentaire JSDoc)
- [ ] Audit trail créé pour opérations sensibles

---

## 2. Stratégie de Tests

### Pyramide de tests

```
       /\
      /E2E\    ← Playwright (parcours critiques)
     /------\
    /  Integ  \ ← Supertest API tests (auth, lots, IA)
   /----------\
  / Unit Tests  \ ← Jest (services, helpers, calculs)
 /──────────────\
```

### Couverture cible

| Couche | Seuil actuel | Objectif Sprint 3 |
|---|---|---|
| Services IA | 60% | 80% |
| Routes API | 20% | 50% |
| Middleware | 40% | 70% |
| Helpers/utils | 70% | 80% |

### Tests unitaires existants

| Fichier | Tests | Couvre |
|---|---|---|
| `__tests__/ai-service.test.js` | 9 | `calculateAssemblageFallback`, weighted analysis |
| `__tests__/imports.test.js` | 18 | CSV parsing, column mapping, volume parsing |
| `__tests__/volume-balance.test.js` | 18 | Volume invariant, SO₂ alerts, VA compliance |

**Total: 45 tests — tous passants**

---

## 3. Sécurité

### OWASP Top 10 — Mesures en place

| Vulnérabilité | Mesure |
|---|---|
| Injection SQL | Parameterized queries ($1, $2...) — AUCUNE interpolation |
| Broken Auth | JWT + bcryptjs, expiry 30j admin / 24h user |
| XSS | React escaping natif, helmet CSP |
| Broken Access Control | verifyToken middleware + role checks |
| Security Misconfiguration | helmet.js, CORS restreint, pas de stack trace en prod |
| Sensitive Data Exposure | HTTPS Railway, JWT stocké en localStorage (mitigation: HttpOnly cookie en Sprint 3) |
| SSRF | Aucun fetch externe côté serveur (sauf OpenAI avec API key contrôlée) |
| Insecure Deserialization | JSON.parse protégé par try/catch, schéma Zod prévu Sprint 3 |

### Scan de sécurité automatisé

```bash
# Run security audit
npm audit --audit-level=high

# Check for high severity CVEs
npm audit --audit-level=critical
```

---

## 4. Gate de Qualité CI/CD

La CI bloque le merge si :
- `tsc --noEmit` échoue (erreurs TypeScript)
- `npm run build` échoue (build cassé)
- Tests backend échouent (> 0 tests failing)
- Présence de secrets hardcodés détectée

La CI émet un warning si :
- Bundle size > 2MB
- `npm audit --audit-level=high` détecte des CVEs

---

## 5. Performance Targets

| Endpoint | P50 cible | P95 cible | Actuel (mesuré) |
|---|---|---|---|
| `GET /api/lots` | < 100ms | < 300ms | ~45ms |
| `GET /api/lots/:id/traceability` | < 200ms | < 500ms | ~120ms |
| `POST /api/ai/assemblage` | < 15s | < 30s | ~8s (OpenAI) |
| `POST /api/ai/chat` (streaming) | < 1s (TTFB) | < 2s | ~400ms |
| `GET /api/dashboard` | < 200ms | < 500ms | ~80ms |

### Optimisations en place

- Index PostgreSQL sur `lot_id`, `status`, `date`, `analysis_date`, `free_so2_mgl`
- Pool de connexions pg (max 20)
- React Query avec cache 5 minutes
- AI timeout guard (30s) + retry (2x)

---

## 6. Runbook des Tests

### Lancer les tests localement

```bash
# Backend tests
cd server && npm test

# Backend tests with coverage
cd server && npm run test:coverage

# Frontend type check
cd frontend && npx tsc --noEmit

# Frontend build
cd frontend && npm run build
```

### Ajouter un test

1. Créer `server/__tests__/{feature}.test.js`
2. Importer la fonction à tester
3. Décrire les cas normaux + cas limites + cas d'erreur
4. Vérifier avec `npm test`
