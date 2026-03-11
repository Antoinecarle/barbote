# ADR-006: Architecture RBAC & Middleware Socle

**Date:** 2026-03-11
**Status:** Accepted (Sprint 2)

## Contexte

Barbote doit supporter plusieurs rôles métier avec des niveaux d'accès distincts :
- **admin** — Accès total, gestion utilisateurs
- **oenologue** — Décisions techniques : lots, analyses, assemblage, IA
- **operator** — Opérations quotidiennes : mouvements, opérations, maintenance
- **viewer** — Consultation uniquement (clients, stagiaires)

## Décision

### 1. RBAC par permission (non par rôle brut)

Chaque route utilise `requirePermission('resource.action')` plutôt que `requireRole('admin', 'oenologue')`. Cela permet :
- Ajout de nouveaux rôles sans toucher aux routes
- Matrice de permissions centralisée dans `middleware/rbac.js`
- Audit lisible : "qui peut faire quoi"

**Matrice de permissions** (`server/middleware/rbac.js`) :

| Permission | admin | oenologue | operator | viewer |
|---|:---:|:---:|:---:|:---:|
| lots.read | ✓ | ✓ | ✓ | ✓ |
| lots.write | ✓ | ✓ | | |
| lots.delete | ✓ | | | |
| analyses.write | ✓ | ✓ | | |
| movements.write | ✓ | ✓ | ✓ | |
| operations.write | ✓ | ✓ | ✓ | |
| maintenance.write | ✓ | ✓ | ✓ | |
| assemblage.write | ✓ | ✓ | | |
| ai.chat | ✓ | ✓ | | |
| imports.write | ✓ | ✓ | | |
| users.manage | ✓ | | | |
| audit.read | ✓ | | | |

### 2. Structured Logging avec requestId

Chaque requête HTTP reçoit un UUID `requestId` :
- Header de réponse : `X-Request-ID`
- Accessible via `req.requestId` et `req.log(level, data)` dans les routes
- Format JSON en prod (log aggregators), pretty-print en dev
- Morgan remplacé par `requestLogger()` (zéro dépendance externe)

### 3. Global Error Handler

`AppError(message, statusCode, code)` permet des erreurs typées :
```js
throw new AppError('Lot non trouvé', 404, 'LOT_NOT_FOUND');
```

Le handler catch-all (`globalErrorHandler`) :
- Sanitise les stack traces en production
- Retourne un format cohérent `{ error, code, requestId }`
- Log structuré de l'erreur avec context (userId, path, method)

### 4. Rate Limiting in-memory

Pas de Redis requis pour le MVP. Sliding window par IP :
- Global API : 200 req/min
- Auth routes : 10 req/min (anti-brute-force)
- AI endpoints : 20 req/min (coût OpenAI)
- Import routes : 5 req/min

### 5. Health endpoint enrichi

`GET /api/health` retourne désormais :
```json
{
  "status": "healthy",
  "database": "ok",
  "uptime_human": "2h 30m",
  "metrics": { "total_requests": 1234, "error_rate": "0.5%", "p95_response_ms": 120 },
  "version": "1.0.0",
  "node_version": "v22.x.x"
}
```

Status 200 si healthy, 503 si dégradé.

## Alternatives rejetées

- **express-rate-limit** — dépendance externe inutile pour le volume actuel
- **casbin** — trop complexe pour 4 rôles fixes
- **winston** — logging JSON natif suffit sans dépendance

## Conséquences

- Positives: sécurité renforcée, debugging simplifié, observabilité dès le départ
- Négatives: les routes existantes ne sont pas encore toutes migrées vers `requirePermission`
- Migration plan: Sprint 3 — remplacer tous les `requireAdmin` par `requirePermission`
