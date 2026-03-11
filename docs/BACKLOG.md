# Barbote - Backlog MVP

## Definition of Done (DoD)

- [ ] Code revu (code review ou auto-review)
- [ ] Tests manuels validés
- [ ] API documentée (route + réponse)
- [ ] Pas de régression sur features existantes
- [ ] Déployé sur staging et validé
- [ ] Performance < 500ms sur endpoints critiques

## Definition of Ready (DoR)

- [ ] User story décrite et estimée
- [ ] Critères d'acceptation définis
- [ ] Dépendances identifiées
- [ ] Maquette disponible si front

---

## Sprint 1 — MVP Core (Semaines 1-4)

### ✅ FAIT

| ID | Feature | Statut |
|---|---|---|
| US-001 | Auth admin + login | ✅ |
| US-002 | CRUD Contenants | ✅ |
| US-003 | CRUD Lots (création, modification) | ✅ |
| US-004 | Mouvements (transfert, entrée, sortie) | ✅ |
| US-005 | Analyses chimiques (saisie + affichage) | ✅ |
| US-006 | Traçabilité d'origine (arbre) | ✅ |
| US-007 | Assemblage IA (3 scénarios) | ✅ |
| US-008 | Calcul matrice analyses assemblage | ✅ |
| US-009 | Chat IA conversationnel (streaming) | ✅ |
| US-010 | Dashboard avec graphiques | ✅ |
| US-011 | Opérations cave (sulfitage, etc.) | ✅ |
| US-012 | Module maintenance | ✅ |
| US-013 | Écran de chargement vidéo | ✅ |
| US-014 | Schéma DB PostgreSQL + migrations | ✅ |
| US-015 | CI/CD GitHub Actions | ✅ |
| US-016 | Docker + PM2 config | ✅ |

### 🔄 EN COURS (Sprint 2 — semaines 5-8)

| ID | Feature | Priorité | Points | Critères d'acceptation |
|---|---|---|---|---|
| US-017 | Export PDF/CSV des rapports | High | 5 | Export lot + analyses + mouvements en PDF/CSV depuis LotDetail |
| US-018 | Import Excel lots (module négociants) | Medium | 8 | Upload .xlsx, mapping colonnes, validation, création lots en batch |
| US-019 | Alertes SO₂ bas (< seuil configurable) | Medium | 3 | Badge rouge dans header + notification persistante |
| US-020 | Gestion multi-utilisateurs + invitations | High | 8 | Admin invite par email, rôles (admin/oeno/operator/viewer) |
| US-021 | OCR bons d'intervention (maintenance) | Low | 13 | Upload photo → extraction texte → pré-remplissage formulaire |
| US-022 | Optimisation mobile responsive | Medium | 3 | Tables scrollables, modals fullscreen, nav hamburger |
| US-023 | Tests unitaires backend (60% coverage) | High | 5 | Jest + coverage report, tests lots + mouvements + audit |
| US-024 | Monitoring prod (Sentry + health endpoint) | Medium | 3 | /api/health endpoint + Sentry DSN configuré |

### 🔲 À FAIRE (Sprint 3 — semaines 9-12)

| ID | Feature | Priorité | Points | Critères d'acceptation |
|---|---|---|---|---|
| US-025 | Prompts IA versionnés (prompt registry) | High | 5 | Prompts storés en DB avec version, A/B testing possible |
| US-026 | Métriques qualité IA (taux d'erreur, latence) | Medium | 5 | Dashboard qualité IA avec p50/p95 latences |
| US-027 | Fallback non-IA pour assemblage | High | 3 | Calcul pondéré manuel si OpenAI timeout |
| US-028 | Extension agroalimentaire: paramétrage | Low | 13 | Config nomenclatures/process dans settings admin |
| US-029 | API publique (read-only) pour intégrations | Low | 8 | API key auth, endpoints GET lots/analyses |
| US-030 | PWA / mode hors-ligne (lecture seule) | Low | 13 | Service Worker + cache lots/analyses |

---

## Personas

### 🧑‍💼 Marc — Maître de chai
- **Objectif**: Tracer chaque lot, valider les assemblages, consulter les analyses
- **Frustrations**: Double saisie papier/logiciel, impossible de retrouver l'origine d'un lot
- **Cas d'usage**: Soutirage quotidien, préparation assemblage millésime

### 👩‍🔬 Sophie — Oenolouge
- **Objectif**: Analyser les paramètres chimiques, recommander les assemblages optimaux
- **Frustrations**: Calculs d'assemblage manuels sur Excel, pas d'historique
- **Cas d'usage**: Rapport d'analyse hebdo, simulation assemblage IA

### 📋 Paul — Responsable traçabilité
- **Objectif**: Audit trail complet, conformité réglementaire
- **Frustrations**: Impossible de retracer l'origine en cas de contrôle
- **Cas d'usage**: Traçabilité inverse (bouteille → raisin), rapports réglementaires

---

## KPIs de succès

| Métrique | Baseline | Objectif |
|---|---|---|
| Temps saisie mouvement | 15 min (papier) | < 2 min |
| Temps traçabilité origine | 1h | < 30 sec |
| Qualité traçabilité (lots tracés) | 60% | > 95% |
| Adoption utilisateurs | 0 | > 80% équipe |
| Temps assemblage IA | N/A | < 30 sec scénarios |
