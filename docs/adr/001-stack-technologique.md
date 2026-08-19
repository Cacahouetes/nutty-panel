# ADR 001: Stack Technologique

## Status

Accepted (validated by project owner on 2026-08-19)

## Context

Le cahier des charges laisse le choix entre Node.js et Python pour le backend. Le frontend est clairement défini comme React + TypeScript + Tailwind. Nous devons choisir une stack complète qui optimise la productivité de développement tout en restant performante pour un usage self-hosté.

## Decision

Nous adoptons la stack suivante:

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + NestJS (TypeScript partagé avec le frontend)
- **Database**: SQLite (MVP) avec migration prévue vers PostgreSQL
- **Containerisation**: Docker (serveurs Minecraft + panel)
- **Reverse Proxy**: Caddy (HTTPS automatique via Let's Encrypt)
- **Gestionnaire de paquets**: pnpm (monorepo workspaces)
- **Orchestration**: Docker Compose

### Justification

- **TypeScript partagé** entre frontend et backend = moins de friction, types réutilisables
- **NestJS** offre une architecture modulaire parfaite pour les modules serveurs, Docker, backups, etc.
- **pnpm** workspaces pour le monorepo avec isolation des dépendances
- **Caddy** pour l'automatisation HTTPS (important pour les débutants)
- **Docker Compose** pour une installation simple (`docker-compose up -d`)

## Consequences

- Les développeurs doivent connaître TypeScript pour contribuer au backend
- Nécessite Node.js 20+ côté développement
- Le passage à PostgreSQL sera un ADR ultérieur
