# Barbote - Documentation Technique Projet

> **ERP de tracabilite cuverie / vin augmente par l'IA**
> Version: 1.0.0 | Date: 2026-03-12

---

## 1. Presentation du Projet

**Barbote** est un ERP de cuverie moderne pour la tracabilite du vin, augmente par l'intelligence artificielle. Il remplace les outils manuels (Excel, classeurs papier) par une plateforme web integree permettant de:
- Suivre les lots de vin de la recolte a la mise en bouteille
- Gerer les contenants (cuves inox, barriques, foudres...)
- Tracer tous les mouvements et operations
- Calculer automatiquement les matrices d'analyses apres assemblage (IA)
- Proposer des plans d'assemblage intelligents (IA)
- Compiler des syntheses via une interface conversationnelle (IA)
- Gerer la maintenance des equipements (conformite ISO 22000)

### Personas
| Persona | Role | Besoins principaux |
|---|---|---|
| Maitre de chai | Admin/Oenologue | Assemblages, analyses, decisions |
| Operateur cave | Operator | Saisie mouvements, operations |
| Oenologue | Oenologue | Analyses, suivi qualite |
| Auditeur | Viewer | Consultation tracabilite |

---

## 2. Architecture Technique

### Stack
| Couche | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + Shadcn/UI + Fontshare (Satoshi + Cabinet Grotesk) |
| Animations | GSAP (ScrollTrigger, useGSAP) |
| State | React Query (TanStack) |
| Backend | Node.js + Express (ESM) |
| Base de donnees | PostgreSQL (Railway) |
| Auth | JWT + bcryptjs + RBAC |
| IA | OpenAI GPT-5-mini + fallback manuel |
| Deploiement | Railway (auto-deploy via GitHub) |
| CI/CD | GitHub Actions |

### Architecture Applicative
```
Client (React SPA)
    |
    | HTTPS
    |
Express API (Node.js)
    |--- Auth (JWT + RBAC)
    |--- Rate Limiting
    |--- Structured Logging
    |--- Error Handler
    |
    +--- /api/auth (login, register)
    +--- /api/lots (CRUD lots)
    +--- /api/containers (CRUD contenants)
    +--- /api/movements (transferts, entrees, sorties)
    +--- /api/analyses (matrices d'analyses)
    +--- /api/ai (assemblage IA, chat IA, recalcul)
    +--- /api/operations (operations cuverie)
    +--- /api/maintenance (equipements, interventions)
    +--- /api/imports (Excel/CSV import)
    +--- /api/dashboard (stats, KPIs)
    +--- /api/monitoring (metrics, health)
    |
PostgreSQL (Railway)
    |--- barbote_users
    |--- barbote_lots
    |--- barbote_containers
    |--- barbote_movements
    |--- barbote_analyses
    |--- barbote_operations
    |--- barbote_maintenance
    |--- barbote_assemblage_plans
    |--- barbote_conversations / barbote_messages
    |--- barbote_audit_log
    |--- barbote_notifications
    |--- barbote_inputs
```

---

## 3. Modele de Donnees

### Tables principales (prefixe `barbote_`)

| Table | Description | Cles |
|---|---|---|
| `barbote_users` | Utilisateurs (admin, oenologue, operator, viewer) | email UNIQUE |
| `barbote_lots` | Lots de vin (unite de tracabilite) | lot_number UNIQUE |
| `barbote_containers` | Contenants (cuves, barriques) | code UNIQUE |
| `barbote_movements` | Mouvements entre contenants | FK lot_id, from/to container |
| `barbote_analyses` | Analyses oenologiques (TAV, pH, SO2...) | FK lot_id |
| `barbote_operations` | Operations (soutirage, filtration, collage...) | FK lot_id |
| `barbote_assemblage_plans` | Plans d'assemblage generes par l'IA | FK lots sources |
| `barbote_maintenance` | Equipements et interventions | code UNIQUE |
| `barbote_inputs` | Intrants oenologiques traces | FK lot_id |
| `barbote_conversations` | Sessions de chat IA | FK user_id |
| `barbote_messages` | Messages dans les conversations IA | FK conversation_id |
| `barbote_audit_log` | Journal d'audit complet | action, entity, user |
| `barbote_notifications` | Notifications utilisateurs | FK user_id |
| `barbote_sessions` | Sessions JWT actives | FK user_id |

### Regles de coherence
- Bilan volumique: sum(mouvements) = delta volume lot
- Analyses: recalcul automatique apres assemblage (moyenne ponderee)
- Tracabilite: chaine parent_lots[] pour remonter a l'origine
- Audit: trigger automatique sur INSERT/UPDATE/DELETE

---

## 4. Endpoints API

### Authentification
| Methode | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Login (email + password) -> JWT |
| POST | `/api/auth/register` | Inscription |
| GET | `/api/auth/me` | Profil courant |

### Lots
| Methode | Route | Description |
|---|---|---|
| GET | `/api/lots` | Liste des lots (filtrable) |
| POST | `/api/lots` | Creer un lot |
| GET | `/api/lots/:id` | Detail d'un lot |
| PUT | `/api/lots/:id` | Modifier un lot |
| DELETE | `/api/lots/:id` | Supprimer un lot |
| GET | `/api/lots/:id/traceability` | Arbre de tracabilite |

### Contenants
| Methode | Route | Description |
|---|---|---|
| GET | `/api/containers` | Liste des contenants |
| POST | `/api/containers` | Creer un contenant |
| PUT | `/api/containers/:id` | Modifier |
| DELETE | `/api/containers/:id` | Supprimer |

### Mouvements
| Methode | Route | Description |
|---|---|---|
| GET | `/api/movements` | Liste des mouvements |
| POST | `/api/movements` | Creer un mouvement |
| GET | `/api/movements/:id` | Detail |

### Analyses
| Methode | Route | Description |
|---|---|---|
| GET | `/api/analyses` | Liste des analyses |
| POST | `/api/analyses` | Saisir une analyse |
| PUT | `/api/analyses/:id` | Modifier |

### IA
| Methode | Route | Description |
|---|---|---|
| POST | `/api/ai/assemblage` | Generer un plan d'assemblage IA |
| GET | `/api/ai/assemblage` | Liste des plans |
| POST | `/api/ai/assemblage/:id/execute` | Executer un plan |
| POST | `/api/ai/recalculate-matrix` | Recalcul matrice post-assemblage |
| POST | `/api/ai/chat` | Message dans le chat IA |
| GET | `/api/ai/chat/conversations` | Liste conversations |
| GET | `/api/ai/chat/:id/messages` | Messages d'une conversation |
| GET | `/api/ai/chat/:id/export` | Export CSV conversation |

### Operations
| Methode | Route | Description |
|---|---|---|
| GET | `/api/operations` | Liste des operations |
| POST | `/api/operations` | Creer une operation |

### Maintenance
| Methode | Route | Description |
|---|---|---|
| GET | `/api/maintenance` | Liste equipements |
| POST | `/api/maintenance` | Creer equipement |
| POST | `/api/maintenance/:id/interventions` | Ajouter intervention |

### Imports
| Methode | Route | Description |
|---|---|---|
| POST | `/api/imports/lots` | Import Excel/CSV de lots |

### Dashboard & Monitoring
| Methode | Route | Description |
|---|---|---|
| GET | `/api/dashboard/stats` | KPIs globaux |
| GET | `/api/dashboard/volume-chart` | Donnees graphe volumes |
| GET | `/api/dashboard/lots-by-type` | Repartition par type |
| GET | `/api/dashboard/recent-activity` | Activite recente |
| GET | `/api/health` | Health check |
| GET | `/api/monitoring/metrics` | Metriques applicatives |
| GET | `/api/monitoring/stats/overview` | Vue d'ensemble monitoring |

---

## 5. Securite & RBAC

### Roles
| Role | Droits |
|---|---|
| `admin` | Tout (CRUD + admin + monitoring) |
| `oenologue` | Lots, analyses, assemblages, chat IA |
| `operator` | Mouvements, operations, saisie |
| `viewer` | Lecture seule |

### Protections
- JWT sur toutes les routes protegees
- Rate limiting global (100 req/min) + auth (10 req/min)
- Helmet pour les headers de securite
- Requetes parametrees (anti-injection SQL)
- Audit log sur toutes les mutations

---

## 6. Deploiement

### Railway (Production)
- **URL**: `https://barbote-app-production.up.railway.app`
- **Auto-deploy**: Push sur `main` -> Railway deploie automatiquement
- **Build**: Nixpacks (Node 20, build frontend, copy to server/dist)
- **Start**: `node server/index.js`
- **Health check**: `/api/health` (timeout 100s)

### Variables d'environnement
| Variable | Description |
|---|---|
| `DATABASE_PUBLIC_URL` | URL PostgreSQL Railway |
| `JWT_SECRET` | Secret JWT (min 32 chars) |
| `OPENAI_API_KEY` | Cle API OpenAI (GPT-5-mini) |
| `BARBOTE_PORT` | Port du serveur (3006) |
| `NODE_ENV` | `production` |

### CI/CD (GitHub Actions)
- Lint (ESLint)
- Build (TypeScript + Vite)
- Tests (Jest)
- Deploy: auto via Railway sur push main

---

## 7. Design System

### Typographie (Fontshare)
- **Titres**: Cabinet Grotesk (700-800)
- **Corps**: Satoshi (400-600)
- **Code**: JetBrains Mono

### Palette
- **Brand**: Wine Red `#8B1A2F`
- **Background**: Ivory `#F5F3EF`
- **Cards**: White `#FFFFFF`
- **Borders**: Warm `#E8E4DE`
- **Text**: Warm Dark `#1A1714`

### Animations (GSAP)
- Page enter: stagger reveal (titre, cards, table)
- Scroll: ScrollTrigger sur sections below fold
- Hover: scale + shadow sur cards
- Login: brand panel + form reveal timeline
- Charts: count-up animation sur KPIs

---

## 8. Decisions d'Architecture (ADRs)

| ADR | Decision |
|---|---|
| ADR-001 | Stack React+Express+PostgreSQL (Railway) |
| ADR-002 | Modele tracabilite: lots + movements + origin chain |
| ADR-003 | Monorepo, conventional commits, Railway auto-deploy |
| ADR-004 | Risques identifies: OpenAI latence, volumes calcul |
| ADR-005 | Extension agroalimentaire via parametrage nomenclature |
| ADR-006 | RBAC 4 roles, middleware chain |

---

## 9. Contacts & Acces

| Element | Valeur |
|---|---|
| Repo GitHub | `github.com/Antoinecarle/barbote` |
| Railway | Projet `barbote`, service `barbote-app` |
| DB Railway | PostgreSQL (var `DATABASE_PUBLIC_URL`) |
| Demo | `admin@barbote.local` (voir seed) |
