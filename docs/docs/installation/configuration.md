---
sidebar_position: 4
---

# Configuration reference

All panel configuration lives in the `.env` file at the repository root.
The installer generates it automatically with fresh secrets.

## Core

| Variable               | Default                | Description                                     |
|------------------------|------------------------|-------------------------------------------------|
| `JWT_SECRET`           | `dev-secret-change-me` | Signs API access tokens. **Use `openssl rand -base64 32` in production.** |
| `PANEL_ADMIN_EMAIL`    | `admin@nutty.panel`    | Initial admin account, created at first boot    |
| `PANEL_ADMIN_PASSWORD` | `change-me`            | Initial admin password                          |
| `PANEL_DOMAIN`         | *(empty)*              | Public domain → automatic HTTPS via Caddy (Let's Encrypt). Empty = plain HTTP on port 80 |
| `DOCKER_HOST`          | `unix:///var/run/docker.sock` | Docker socket used by the API           |
| `PORT`                 | `3000`                 | Backend API port (dev only)                     |

## Smart Proxy

| Variable                 | Default       | Description                                      |
|--------------------------|---------------|--------------------------------------------------|
| `PROXY_PUBLIC_PORT`      | `25565`       | Single public port for all Minecraft servers     |
| `PROXY_DOMAIN`           | `play.local`  | Hostname suffix; each server gets `<slug>.<PROXY_DOMAIN>` |
| `PROXY_DEFAULT_SERVER_ID`| *(empty)*     | Server that receives connections with an unknown hostname |
| `PROXY_HOST`             | `0.0.0.0`     | Address the proxy listens on                     |

## Playit.gg

| Variable            | Description                            |
|---------------------|----------------------------------------|
| `PLAYIT_API_KEY`    | Playit.gg API key (agent tunnels)      |
| `PLAYIT_AGENT_BIN`  | Path to the Playit agent binary        |
| `PLAYIT_AGENT_SECRET` | Secret used to authenticate the agent |
| `PLAYIT_API_BASE`   | Playit API base URL (default `https://api.playit.gg`) |

## Integrations

| Variable             | Description                        |
|----------------------|------------------------------------|
| `CURSEFORGE_API_KEY` | CurseForge API key for modpacks    |
| `MODRINTH_TOKEN`     | Optional Modrinth token            |

## Authentication

- **JWT** — short-lived access tokens (15 min) refreshed automatically by the dashboard.
- **2FA** — optional TOTP one-time codes, enabled from the profile page.
- **API keys** — long-lived tokens for scripts and integrations, created from the profile page.

:::
Never commit your `.env` file — it is ignored by git and contains secrets.
:::