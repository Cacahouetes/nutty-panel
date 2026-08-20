---
sidebar_position: 1
---

# Prerequisites

Nutty Panel is designed to run on modest hardware — a 2 GB VPS is enough for a few servers.

## Hardware

- **RAM**: 2 GB minimum (more for Forge/Fabric modpacks)
- **CPU**: 1–2 cores
- **Disk**: 10 GB free (grows with worlds and backups)
- **OS**: Ubuntu 22.04 LTS, Debian 12 or CentOS/RHEL (any Linux with `apt` or `dnf`)

## Software

The one-command installer handles everything for you:

- **Docker** + Docker Compose plugin
- **curl** (to fetch the installer)
- **git** (only for manual installs)

## Network

- An **open TCP port** for the panel (default: port `80`, or `443` when you provide a domain for HTTPS)
- If you want players to connect on the default Minecraft port, open **TCP 25565** (Smart Proxy)
- Optional: a **domain** pointing to your server to get automatic HTTPS via Caddy (Let's Encrypt)

## Optional API keys

| Integration | Key             | Where                        |
|-------------|-----------------|------------------------------|
| CurseForge  | `CURSEFORGE_API_KEY` | [curseforge.com](https://www.curseforge.com) API dashboard |
| Playit.gg   | `PLAYIT_API_KEY`     | [playit.gg](https://playit.gg) account |

They can be added later in `.env` — nothing blocks installation without them.