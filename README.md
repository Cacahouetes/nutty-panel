# Nutty Panel

Ultimate self-hosted Minecraft server panel — simple for beginners, powerful for experts.

## Architecture

| Layer        | Tech                          |
|-------------|-------------------------------|
| Frontend    | React + TypeScript + Tailwind (Vite) |
| Backend     | Node.js + NestJS              |
| Database    | SQLite (MVP) → PostgreSQL     |
| Container   | Docker                        |
| Proxy       | Caddy / Nginx                 |
| CI/CD       | GitHub Actions                |

## Structure

```
client/          — React frontend (SPA via Vite) + Vitest
server/          — NestJS backend API + Jest
infra/           — Dockerfiles, Docker Compose, nginx.conf
docs/            — Documentation site (Docusaurus, à venir)
```

## Quick Start (Dev)

```bash
pnpm install
pnpm dev            # frontend (5173) + backend (3000)
pnpm test           # single file: pnpm test src/foo.spec.ts
pnpm test:unit      # full suite
pnpm typecheck      # TypeScript strict
pnpm lint           # oxlint (client) + ESLint (server)
```

## Commands

| Command               | Description                                  |
|-----------------------|----------------------------------------------|
| `pnpm dev`            | Démarre frontend + backend en parallèle      |
| `pnpm build`          | Build de tous les packages                   |
| `pnpm test:unit`      | Suite de tests complète                      |
| `pnpm typecheck`      | TypeScript strict sur client + server        |
| `pnpm lint`           | Lint (oxlint client, ESLint server)          |

## Skills & Agents

Ce projet utilise l'écosystème [skills.sh](https://www.skills.sh/) et des agents OpenCode
spécialisés. Voir `AGENTS.md` pour la liste complète des commandes (`/code-review`, `/tdd`, `/implement`, ...).

## License

MIT