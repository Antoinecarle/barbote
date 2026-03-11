# Barbote — Runbook de Production

**Version:** 1.0.0
**Date:** 2026-03-11

---

## 1. Accès & Urls

| Environnement | URL | Branche |
|---|---|---|
| Production | Railway (var RAILWAY_PUBLIC_DOMAIN) | main |
| Staging | Railway staging | develop |
| Health | `{BASE_URL}/api/health` | — |
| Monitoring | `{BASE_URL}/api/monitoring/metrics` | — |

---

## 2. Variables d'environnement requises

```bash
DATABASE_PUBLIC_URL=postgresql://...   # Railway PostgreSQL
JWT_SECRET=<strong-random-secret>       # Min 32 chars
OPENAI_API_KEY=sk-...                   # OpenAI API
BARBOTE_PORT=3006                       # Listening port
NODE_ENV=production                     # Enable prod optimizations
```

Générer JWT_SECRET :
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 3. Démarrage & arrêt

### Démarrage (Railway)
Push sur `main` → déploiement automatique en ~2-3 minutes.

### Vérification post-déploiement
```bash
curl -f https://{BASE_URL}/api/health
# Attendu: {"status":"healthy","database":"ok",...}
```

### Redémarrage forcé (Railway)
Via le dashboard Railway : Service → Settings → Restart

### PM2 (si VPS)
```bash
pm2 start ecosystem.config.cjs --env production
pm2 logs barbote-api
pm2 restart barbote-api
pm2 stop barbote-api
```

---

## 4. Monitoring & Alertes

### Endpoints de monitoring

```bash
# Santé générale (public)
GET /api/health

# Statut opérationnel compact
GET /api/monitoring/status        # Auth: admin

# Métriques détaillées (process, DB, AI)
GET /api/monitoring/metrics       # Auth: admin

# Alertes vin (SO₂, AV, maintenance)
GET /api/monitoring/alerts        # Auth: tous utilisateurs
```

### Seuils d'alerte vin

| Paramètre | Critique | Avertissement |
|---|---|---|
| SO₂ libre | < 10 mg/L | 10–19.9 mg/L |
| Acidité volatile | > 0.8 g/L | 0.6–0.8 g/L |
| Maintenance | Passée | Dans les 7 jours |

### Polling recommandé
```bash
# Crontab — vérification toutes les 5 minutes
*/5 * * * * curl -sf {BASE_URL}/api/health | grep -q '"status":"healthy"' || \
  echo "ALERT: Barbote health check failed" | mail -s "Barbote DOWN" admin@cave.fr
```

---

## 5. Incidents — Procédures de réponse

### P0 — Application inaccessible

1. Vérifier Railway Dashboard → status du service
2. Vérifier les logs : `GET /api/monitoring/metrics`
3. Vérifier la DB : tenter `GET /api/health`
4. Si DB indisponible → Railway PostgreSQL Dashboard
5. Redémarrer le service si nécessaire

**SLO:** Résolution < 30 minutes

### P1 — Erreurs 5xx > 1%

1. Consulter les logs Railway (rechercher `"level":"error"`)
2. Identifier `requestId` dans les erreurs
3. Chercher la trace dans les logs : `grep requestId`
4. Corriger + redéployer (push sur main)

**SLO:** Résolution < 2 heures

### P2 — IA en échec (OpenAI timeout)

L'API utilise un fallback automatique (`calculateAssemblageFallback`).
**Action:** Aucune action immédiate requise — fonctionnement dégradé acceptable.
Surveiller: `GET /api/ai/metrics` → `success_rate`

### P3 — Alertes SO₂ ou AV

1. `GET /api/monitoring/alerts` pour la liste
2. Notifier l'œnologue responsable
3. Aucune action technique requise

---

## 6. Base de données

### Connexion directe (urgence)
```bash
# Via Railway CLI
railway connect postgres

# Via psql (nécessite DATABASE_PUBLIC_URL)
psql $DATABASE_PUBLIC_URL
```

### Requêtes de diagnostic
```sql
-- Lots actifs avec volume
SELECT lot_number, name, current_volume_liters, status
FROM barbote_lots WHERE status = 'active'
ORDER BY current_volume_liters DESC;

-- Alertes SO₂ en cours
SELECT * FROM barbote_so2_alerts;

-- Volume balance check
SELECT barbote_check_volume_balance(id) as discrepancy, lot_number
FROM barbote_lots
WHERE barbote_check_volume_balance(id) != 0;

-- Activité récente (audit trail)
SELECT action, table_name, record_id, user_id, created_at
FROM barbote_audit_log
ORDER BY created_at DESC
LIMIT 20;

-- AI metrics dernières 24h
SELECT operation, COUNT(*) calls, AVG(latency_ms)::int avg_ms,
       COUNT(*) FILTER (WHERE success) ok, COUNT(*) FILTER (WHERE used_fallback) fallbacks
FROM barbote_ai_metrics
WHERE called_at > NOW() - INTERVAL '24h'
GROUP BY operation;
```

### Backup
Railway effectue des backups automatiques quotidiens. Rétention : 7 jours.
```bash
# Export manuel
pg_dump $DATABASE_PUBLIC_URL > backup-$(date +%Y%m%d).sql
```

---

## 7. Logs

### Format de log (production)
```json
{"ts":"2026-03-11T10:30:00.000Z","service":"barbote-api","level":"info","requestId":"uuid","method":"GET","path":"/api/lots","status":200,"duration_ms":45,"userId":"user-uuid","ip":"1.2.3.4"}
```

### Recherche dans les logs Railway
```bash
# Filtrer erreurs 500
railway logs | grep '"level":"error"'

# Filtrer par requestId
railway logs | grep "\"requestId\":\"<uuid>\""

# Filtrer requêtes lentes (> 500ms)
railway logs | jq 'select(.duration_ms > 500)'
```

---

## 8. Sécurité — Actions immédiates

### Token JWT compromis
```bash
# 1. Changer JWT_SECRET dans Railway env vars
# 2. Redéployer → toutes les sessions existantes sont invalidées
```

### Clé OpenAI compromise
```bash
# 1. Révoquer la clé sur platform.openai.com
# 2. Générer une nouvelle clé
# 3. Mettre à jour OPENAI_API_KEY dans Railway
# 4. Redéployer
```

### Compte admin compromis
```sql
-- Reset du hash de mot de passe (bcryptjs hash)
UPDATE barbote_users SET password_hash = '$2a$12$newHashHere' WHERE email = 'admin@cave.fr';
```

---

## 9. Performance — Tuning

### Requêtes lentes
```sql
-- Activer pg_stat_statements si disponible
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Index manquants
```sql
-- Vérifier les seq scans sur grandes tables
SELECT schemaname, tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_scan DESC;
```

---

## 10. Rollback

```bash
# Voir les déploiements Railway
railway deployments

# Rollback au déploiement précédent (via dashboard Railway)
# Ou: git revert + push

# Rollback git
git revert HEAD
git push origin main
```

---

## 11. Contacts

| Rôle | Contact |
|---|---|
| Lead technique | tech@cave.fr |
| Œnologue référent | oeno@cave.fr |
| Railway support | support.railway.app |
| OpenAI status | status.openai.com |
