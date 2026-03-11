# ADR-004: Risques, Assumptions & Jalons MVP

**Date:** 2026-03-11
**Status:** Accepted

## Risques Identifiés

| ID | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Latence OpenAI > 30s pour assemblage IA | Moyenne | Élevé | Async processing + polling, fallback calcul manuel |
| R-02 | Perte de connexion PostgreSQL Railway | Faible | Critique | Pool reconnect, retry logic, health check |
| R-03 | Adoption faible (changement de workflow) | Moyenne | Élevé | Formation, démo vidéo, mode hors-ligne à terme |
| R-04 | Données incorrectes saisies (volumes erronés) | Élevée | Moyen | Validation bilan volumique, alertes en temps réel |
| R-05 | Réglementation viticole évolutive | Faible | Moyen | Paramétrage des doses max, mise à jour régulière |
| R-06 | Vendor lock-in OpenAI | Faible | Moyen | Abstraction service IA, portabilité vers Anthropic/Mistral |
| R-07 | Concurrent sessionnel (conflits d'édition) | Faible | Moyen | Optimistic locking, last-write-wins + audit trail |
| R-08 | Sécurité: accès non autorisé aux données cave | Faible | Critique | JWT + RBAC, HTTPS, audit log complet |

## Assumptions

- Les utilisateurs ont une connexion internet stable (pas de mode hors-ligne requis en MVP)
- Un seul domaine viticole par instance (multi-tenant hors scope MVP)
- Export PDF/CSV est une priorité Sprint 2 (pas bloquant pour la mise en production)
- Les analyses sont saisies manuellement (import lab via API dans Sprint 3)
- L'interface est en français uniquement (internationalisation hors scope)

## Jalons MVP

| Jalon | Date cible | Critères |
|---|---|---|
| ✅ MVP v1.0 | Semaine 4 | Auth + CRUD lots/contenants + mouvements + analyses + IA assemblage |
| 🎯 Release v1.1 | Semaine 8 | Export PDF/CSV + multi-utilisateurs + notifications SO₂ |
| 🔮 Release v1.2 | Semaine 12 | Import Excel + OCR maintenance + tests unitaires complets |
| 🔮 Release v2.0 | Q3 2026 | Extension agroalimentaire + API publique + mobile PWA |

## Décisions Actées

| # | Décision | Raison |
|---|---|---|
| D-01 | Node.js + PostgreSQL (pas Python/Django) | Cohérence Archonse, simplicité |
| D-02 | OpenAI pour IA (pas Mistral local) | Qualité, JSON mode fiable |
| D-03 | JSONB pour données flexibles | Analyses extensibles, pas de migrations pour nouveaux paramètres |
| D-04 | Mouvements append-only | Auditabilité irréfutable pour conformité |
| D-05 | Railway pour déploiement | Simplicité, PostgreSQL inclus, git push deploy |
| D-06 | Pas de WebSocket temps réel en MVP | Complexité vs gain faible pour équipe < 5 personnes |
