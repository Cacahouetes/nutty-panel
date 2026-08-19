# AGENTS.md — Nutty Panel

> **Ultimate self-hosted Minecraft server panel** — simple for beginners, powerful for experts.
> Open source, Docker-native, self-hosted.

## Project Overview

Nutty Panel is a full-stack web application for managing Minecraft servers. It supports
multiple server types (Vanilla, Paper, Fabric, Forge, Bedrock), integrates with
CurseForge/Modrinth, uses Docker for isolation, and provides a modern React dashboard.

### Architecture Summary

| Layer        | Tech                          |
|-------------|-------------------------------|
| Frontend    | React + TypeScript + Tailwind |
| Backend     | Node.js + NestJS              |
| Database    | SQLite (MVP) → PostgreSQL     |
| Container   | Docker                        |
| Proxy       | Caddy / Nginx                 |
| CI/CD       | GitHub Actions                |

```
client/          — React frontend (SPA via Vite)
server/          — NestJS backend API + server orchestration
  src/modules/   — Domain modules (servers, docker, files, backups, auth, etc.)
  src/plugins/   — Third-party integrations (CurseForge, Modrinth, Playit)
infra/           — Docker Compose, Caddy/Nginx configs, install scripts
docs/            — Documentation site (Docusaurus) + contributor guides
```

## Quick Start (Dev)

```bash
# 1. Install dependencies
pnpm install

# 2. Start dev servers
pnpm dev          # frontend + backend (concurrently)

# 3. Run tests
pnpm test          # single file: pnpm test src/foo.spec.ts
pnpm test:unit     # full suite with coverage
pnpm typecheck     # TypeScript across both projects
```

## Code Conventions

- **Monorepo** with `pnpm` workspaces: `client/`, `server/`, `infra/`, `docs/`.
- **TypeScript** strict mode everywhere (`tsconfig.json` with `"strict": true`).
- **Prettier** for formatting (no semicolons, 2-space indent, single quotes).
- **ESLint** with `@typescript-eslint` — `pnpm lint` must pass before PR.
- **Conventional Commits** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, etc.
- **TDD** — write failing tests first at agreed seams before implementation.
- **Deep modules** — small interfaces, large implementations, testable through seams.

## Agent Skills

This project uses the [Skills](https://www.skills.sh/) agent-skills ecosystem.
Skills are installed under `.agents/skills/` and orchestrated via the commands below.
Specialized agents live in `.opencode/agents/`.

| Command              | Skill                       | Purpose                                   |
|---------------------|----------------------------|-------------------------------------------|
| `/find-skills`      | `find-skills`              | Discover & install new skills from ecosystem |
| `/setup-skills`     | `setup-matt-pocock-skills` | Scaffold issue tracker, triage labels, domain docs |
| `/code-review`      | `code-review`              | Two-axis PR review (standards + spec)     |
| `/tdd`              | `tdd`                      | Test-driven development workflow            |
| `/implement`        | `implement`                | Implement a spec/ticket with TDD + review |
| `/to-prd`           | `to-prd`                   | Synthesize conversation into a PRD          |
| `/design`           | `codebase-design`          | Deep module design language & principles   |
| `/refactor`         | `improve-codebase-architecture` | Find & propose deep-module refactors   |
| `/qa`               | `qa`                       | Interactive QA → GitHub issues              |
| `/react-best-practices` | `vercel-react-best-practices` | React/Next.js best practices         |
| `/domain-modeling`  | `domain-modeling`          | Domain modeling sessions                   |
| `/git-release`      | `git-release` (custom)     | Release management & changelog generation  |

### Agent Roles

Specialized sub-agents live in `.opencode/agents/`. Each is scoped to a single
domain and follows TDD where applicable.

| Agent           | When to use                                    |
|----------------|-------------------------------------------------|
| `code-reviewer` | Before merging — full two-axis review           |
| `coder`         | Implement a feature/ticket with TDD             |
| `doc-writer`    | Write or update docs (user guides, API ref)     |
| `git-release`   | Cut a release, generate changelog, bump version |
| `architect`     | Design module boundaries, propose refactors     |
| `qa-agent`      | Run QA sessions, file bug reports               |
