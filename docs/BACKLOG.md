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

### 🔲 À FAIRE (Sprint 2)

| ID | Feature | Priorité |
|---|---|---|
| US-017 | Export PDF/CSV des rapports | High |
| US-018 | Import Excel lots (module négociants) | Medium |
| US-019 | Notifications temps réel (SO₂ bas, etc.) | Medium |
| US-020 | Gestion multi-utilisateurs (invitations) | High |
| US-021 | OCR bons d'intervention (maintenance) | Low |
| US-022 | Mobile responsive optimization | Medium |
| US-023 | Tests unitaires backend | High |
| US-024 | Monitoring/alertes (Sentry/Grafana) | Medium |

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
