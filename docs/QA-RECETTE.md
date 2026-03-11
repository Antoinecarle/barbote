# Barbote — Plan de Recette QA

**Version:** 1.0.0
**Date:** 2026-03-11
**Sprint:** Sprint 2 → v1.0 Release

---

## 1. Périmètre de la recette

### Fonctionnalités testées (Sprint 2)

| Module | Fonctionnalité | Priorité |
|---|---|---|
| Auth | Login / logout / JWT expiry | P0 |
| Lots | CRUD lots, changement de statut | P0 |
| Mouvements | Entrée, sortie, transfert, perte | P0 |
| Analyses | Saisie analyse, alertes SO₂ | P0 |
| Contenants | CRUD contenants, liaison lot | P1 |
| Assemblage IA | Création plan, scénarios, fallback | P0 |
| Chat IA | Conversation contextualisée | P1 |
| Imports | CSV/XLSX lots, validate, dry-run | P1 |
| Dashboard | Stats, volume chart, activité récente | P1 |
| RBAC | Restriction par rôle | P0 |

---

## 2. Cas de test

### 2.1 Authentification

| ID | Scénario | Étapes | Résultat attendu |
|---|---|---|---|
| AUTH-01 | Login valide | POST /api/auth/login avec email+password corrects | 200 + JWT token |
| AUTH-02 | Login invalide | POST /api/auth/login avec mot de passe incorrect | 401 |
| AUTH-03 | Token expiré | Requête avec token JWT expiré | 401 Token invalide |
| AUTH-04 | Sans token | GET /api/lots sans Authorization header | 401 Token manquant |
| AUTH-05 | Rate limit auth | 11 tentatives en 60s depuis même IP | 429 après le 10ème |

### 2.2 Gestion des lots

| ID | Scénario | Étapes | Résultat attendu |
|---|---|---|---|
| LOT-01 | Créer un lot | POST /api/lots avec données valides (oenologue) | 201 + lot créé |
| LOT-02 | Créer lot — viewer interdit | POST /api/lots avec rôle viewer | 403 INSUFFICIENT_ROLE |
| LOT-03 | Lire les lots | GET /api/lots avec pagination | 200 + liste paginée |
| LOT-04 | Détail lot + traçabilité | GET /api/lots/:id/traceability | 200 + timeline complète |
| LOT-05 | Mettre à jour un lot | PUT /api/lots/:id (oenologue) | 200 + lot mis à jour |
| LOT-06 | Supprimer un lot | DELETE /api/lots/:id (admin) | 204 |
| LOT-07 | Supprimer lot — oenologue interdit | DELETE /api/lots/:id (oenologue) | 403 |
| LOT-08 | Filtres actifs | GET /api/lots?status=active&type=rouge | 200 + filtrés |

### 2.3 Mouvements (invariant volume)

| ID | Scénario | Étapes | Résultat attendu |
|---|---|---|---|
| MOV-01 | Entrée volume | POST /api/movements type=entree, volume=1000L | current_volume +1000 |
| MOV-02 | Sortie volume | POST /api/movements type=sortie, volume=500L | current_volume -500 |
| MOV-03 | Perte volume | POST /api/movements type=perte, volume=50L | current_volume -50 |
| MOV-04 | Transfert lot-à-lot | POST /api/movements type=transfert | source -V, dest +V |
| MOV-05 | Volume négatif interdit | Sortie > volume disponible | 422 ou volume_after >= 0 |

### 2.4 Analyses & alertes

| ID | Scénario | Étapes | Résultat attendu |
|---|---|---|---|
| ANA-01 | Saisie analyse complète | POST /api/analyses avec tous paramètres | 201 |
| ANA-02 | Alerte SO₂ < 20 mg/L | Analyse avec free_so2_mgl=15 | Alert flag dans réponse |
| ANA-03 | Alerte AV > 0.6 g/L | Analyse avec volatile_acidity_gl=0.8 | Alert flag dans réponse |
| ANA-04 | Vue SO₂ alerts | GET /api/analyses/so2-alerts | Liste des lots concernés |

### 2.5 Assemblage IA

| ID | Scénario | Étapes | Résultat attendu |
|---|---|---|---|
| ASS-01 | Création plan IA | POST /api/ai/assemblage avec lots + volume | 200 + 3 scénarios |
| ASS-02 | Fallback sans OpenAI | Couper OPENAI_API_KEY + POST /api/ai/assemblage | 200 + used_fallback=true |
| ASS-03 | Métadonnées prompt | Réponse assemblage | prompt_version présent |
| ASS-04 | Scénario qualité triée | Scénarios dans ordre quality_score DESC | Premier = meilleur score |
| ASS-05 | Moins de 2 lots | POST avec 1 seul lot_id | 400 ou scénarios vides |

### 2.6 Import CSV/XLSX

| ID | Scénario | Étapes | Résultat attendu |
|---|---|---|---|
| IMP-01 | Valider CSV valide | POST /api/imports/validate avec CSV correct | valid_count > 0 |
| IMP-02 | Valider avec erreurs | CSV avec lot_number manquant | invalid_count > 0 + erreurs |
| IMP-03 | Import réel | POST /api/imports/lots avec CSV valide | inserted_count > 0 |
| IMP-04 | Dry-run | POST /api/imports/lots?dry_run=true | dry_run=true, 0 insérés |
| IMP-05 | Skip errors | POST /api/imports/lots?skip_errors=true | lignes valides insérées |
| IMP-06 | Template CSV | GET /api/imports/template | fichier CSV téléchargeable |
| IMP-07 | Doublon détecté | Importer un lot déjà existant | Erreur "existe déjà" |

### 2.7 RBAC

| ID | Scénario | Role | Résultat attendu |
|---|---|---|---|
| RBAC-01 | Admin tout accès | admin | Tous les endpoints accessibles |
| RBAC-02 | Viewer lecture seule | viewer | GET OK, POST/PUT/DELETE → 403 |
| RBAC-03 | Operator sans AI | operator | POST /api/ai/chat → 403 |
| RBAC-04 | Oenologue sans delete | oenologue | DELETE /api/lots/:id → 403 |

### 2.8 Performance

| ID | Endpoint | Seuil P95 |
|---|---|---|
| PERF-01 | GET /api/lots | < 300ms |
| PERF-02 | GET /api/lots/:id/traceability | < 500ms |
| PERF-03 | GET /api/dashboard/stats | < 500ms |
| PERF-04 | POST /api/ai/assemblage (fallback) | < 1s |
| PERF-05 | GET /api/health | < 100ms |

---

## 3. Critères Go / No-Go

### Bloquants (NO-GO si non satisfaits)

- [ ] **AUTH-01 à AUTH-04** : Authentification fonctionnelle
- [ ] **LOT-01 à LOT-05** : CRUD lots sans régression
- [ ] **MOV-01 à MOV-04** : Invariant de volume respecté
- [ ] **RBAC-02** : Viewer ne peut pas écrire
- [ ] **ASS-02** : Fallback IA opérationnel
- [ ] Build frontend sans erreur TypeScript (`tsc --noEmit`)
- [ ] Build production sans erreur (`npm run build`)
- [ ] 69 tests backend passants

### Avertissements (peut passer si documenté)

- [ ] AV > 0.6 — alerte visible mais non bloquante
- [ ] Rate limiting testé manuellement
- [ ] Import XLSX fonctionne (xlsx lib optionnelle)
- [ ] Performance PERF-03 : peut dépasser 500ms si cold start DB

### Métriques acceptables

| Métrique | Seuil NO-GO | Seuil WARNING |
|---|---|---|
| Tests failing | > 0 | — |
| TypeScript errors | > 0 | — |
| Build errors | > 0 | — |
| API P95 (lots) | > 1s | > 300ms |
| API P95 (health) | > 500ms | > 100ms |
| Bundle size | > 5MB | > 2MB |

---

## 4. Script de smoke test

```bash
#!/bin/bash
# smoke-test.sh — Barbote v1.0 pre-deploy validation
# Usage: BASE_URL=https://barbote.railway.app bash smoke-test.sh

BASE_URL=${BASE_URL:-http://localhost:3006}
PASS=0
FAIL=0

check() {
  local name=$1 url=$2 expected_status=$3
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" = "$expected_status" ]; then
    echo "✅ $name ($status)"
    PASS=$((PASS+1))
  else
    echo "❌ $name — expected $expected_status, got $status"
    FAIL=$((FAIL+1))
  fi
}

check_json() {
  local name=$1 url=$2 method=${3:-GET} body=$4 token=$5
  local args="-s -o /dev/null -w %{http_code}"
  [ "$method" = "POST" ] && args="$args -X POST -H 'Content-Type: application/json' -d '$body'"
  [ -n "$token" ] && args="$args -H 'Authorization: Bearer $token'"
  status=$(eval curl $args "$url")
  echo "  → $name: HTTP $status"
}

echo "=== Barbote Smoke Tests — $BASE_URL ==="
echo ""

# Health
check "GET /api/health" "$BASE_URL/api/health" 200

# Auth
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@barbote.fr","password":"demo123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ Login (token obtained)"
  PASS=$((PASS+1))
else
  echo "❌ Login failed"
  FAIL=$((FAIL+1))
fi

# Protected routes
for route in lots containers dashboard/stats analyses; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/$route")
  if [ "$status" = "200" ]; then
    echo "✅ GET /api/$route"
    PASS=$((PASS+1))
  else
    echo "❌ GET /api/$route — HTTP $status"
    FAIL=$((FAIL+1))
  fi
done

# Without token
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/lots")
if [ "$status" = "401" ]; then
  echo "✅ Unauthenticated request returns 401"
  PASS=$((PASS+1))
else
  echo "❌ Expected 401 without token, got $status"
  FAIL=$((FAIL+1))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
```

---

## 5. Checklist pré-déploiement

```bash
# 1. Tests backend
cd server && npm test
# Expected: 69 tests passing

# 2. TypeScript check
cd frontend && npx tsc --noEmit
# Expected: 0 errors

# 3. Frontend build
cd frontend && npm run build
# Expected: build succeeds, no warnings

# 4. Security audit
npm audit --audit-level=high
cd server && npm audit --audit-level=high
# Expected: 0 high/critical CVEs

# 5. Bundle size check
ls -lh frontend/dist/assets/*.js | awk '{print $5, $9}'
# Expected: < 2MB total

# 6. Smoke test against staging
BASE_URL=https://barbote-staging.up.railway.app bash docs/smoke-test.sh
# Expected: all green
```

---

## 6. Environnements

| Env | URL | Branche | Auto-deploy |
|---|---|---|---|
| Local | http://alfredhub.io:3006 | — | non |
| Staging | Railway staging | develop | oui (push) |
| Production | Railway prod | main | oui (push) |

---

## 7. Résultats de recette

| Date | Version | Testeur | Résultat |
|---|---|---|---|
| 2026-03-11 | v1.0.0-rc1 | Sprint 2 auto | 69/69 tests ✓, Build ✓ |
