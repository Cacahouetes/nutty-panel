---
sidebar_position: 3
---

# Manual installation

Prefer to run every step yourself? Here is what the installer does, by hand.

## 1. Install Docker

On Ubuntu/Debian:

```bash
curl -fsSL https://get.docker.com | sh
```

Verify the Compose plugin:

```bash
docker compose version
```

## 2. Clone the repository

```bash
git clone https://github.com/Cacahouetes/nutty-panel.git ~/nutty-panel
cd ~/nutty-panel
```

## 3. Configure the environment

Copy the example and generate real secrets:

```bash
cp .env.example .env
# Generate a strong JWT secret:
openssl rand -base64 32 | tr -d '\n'
```

Edit `.env`:

| Variable               | Required | Description                                     |
|------------------------|----------|-------------------------------------------------|
| `JWT_SECRET`           | yes      | Secret used to sign API tokens                  |
| `PANEL_ADMIN_EMAIL`    | yes      | Initial admin email (bootstrapped on first start) |
| `PANEL_ADMIN_PASSWORD` | yes      | Initial admin password                          |
| `PANEL_DOMAIN`         | no       | Public domain for HTTPS via Caddy               |
| `DOCKER_HOST`          | no       | Docker socket (default `unix:///var/run/docker.sock`) |
| `CURSEFORGE_API_KEY`   | no       | CurseForge integration                          |
| `PLAYIT_API_KEY`       | no       | Playit.gg integration                           |
| `PROXY_PUBLIC_PORT`    | no       | Smart Proxy public port (default `25565`)       |
| `PROXY_DOMAIN`         | no       | Hostname suffix for Smart Proxy routing         |

See [Configuration](./configuration.md) for the full reference.

## 4. Start the panel

```bash
docker compose up -d --build
```

## 5. Log in

Open `http://localhost` and use the credentials from `.env`.

## Uninstall

```bash
bash infra/uninstall.sh
```