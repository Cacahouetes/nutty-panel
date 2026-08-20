---
sidebar_position: 1
---

# Introduction

**Nutty Panel** is an open-source, self-hosted control panel for Minecraft servers.
It is designed to be simple for beginners and powerful for experts.

## What Nutty Panel does

- **Create and manage Minecraft servers** — Vanilla, Paper, Fabric, Forge and Bedrock instances
  run in isolated Docker containers with CPU and memory limits.
- **Full lifecycle control** — start, stop, restart and kill servers, watch live metrics
  (CPU/RAM), read the console and manage files through a web dashboard.
- **Automatic backups** — manual or scheduled backups with one-click restore.
- **Mods and modpacks** — install plugins and modpacks straight from CurseForge and Modrinth.
- **Smart Proxy** — expose every server through a single public port; players are routed
  to the right server based on the hostname they use.
- **Playit.gg tunnels** — expose servers behind NAT or a firewall without opening ports.
- **Webhooks** — notify Discord, Slack or any HTTP endpoint on panel events.

## Architecture

| Layer      | Tech                          |
|------------|-------------------------------|
| Frontend   | React + TypeScript + Tailwind |
| Backend    | Node.js + NestJS              |
| Database   | SQLite (MVP)                  |
| Containers | Docker                        |
| Proxy      | Caddy (HTTPS) / Smart Proxy   |

## Repository layout

```
client/          — React frontend (SPA via Vite)
server/          — NestJS backend API
infra/           — Dockerfiles, install scripts, Caddy/Nginx configs
docs/            — this documentation site (Docusaurus)
```

## Next steps

- [Installation](./installation/quickstart.md) — get the panel running in minutes.
- [User guide](./guides/first-server.md) — create your first server.
- [FAQ](./faq.md) — common problems and solutions.