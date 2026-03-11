# ADR-001: Architecture Decision — Tech Stack

**Date:** 2026-03-11
**Status:** Accepted
**Deciders:** Équipe Barbote

## Contexte

Choix du socle technique pour la plateforme de traçabilité cuverie Barbote.

## Décision

### Backend
- **Node.js + Express** (ESM modules)
- Justification: Cohérence avec l'écosystème Archonse, simplicité de déploiement, performance pour I/O asynchrone

### Frontend
- **React 18 + TypeScript + Vite**
- Justification: Typage fort, performance, écosystème riche, compatibilité avec Archonse

### Base de données
- **PostgreSQL (Railway)** — JAMAIS SQLite
- Justification: ACID transactions critiques pour traçabilité, JSONB pour données flexibles, UUID pour identifiants distribués

### IA
- **OpenAI GPT-4o-mini** pour les fonctionnalités d'assemblage IA et chat
- Justification: API mature, streaming support, JSON mode pour sorties structurées

### Authentification
- **JWT** (jsonwebtoken) avec expiry 30 jours
- Justification: Stateless, compatible mobile/API, simple à impl

## Conséquences

- Positives: Stack unifié, déploiement simple, maintenabilité
- Négatives: Pas de typage strict côté serveur (à améliorer avec TypeScript)
- Risques: Vendor lock-in OpenAI (mitigation: abstraction service IA)
