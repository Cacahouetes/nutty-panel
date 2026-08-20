---
sidebar_position: 2
---

# Quick start (one-command install)

The installer clones the repository, generates secure secrets, and starts the panel with Docker.

## Install

```bash
bash <(curl -s https://nutty-panel.com/install.sh)
```

Or run it locally from a checkout:

```bash
bash infra/install.sh
```

### Options

| Option              | Description                                          |
|---------------------|------------------------------------------------------|
| `--domain <host>`   | Public domain for automatic HTTPS (Let's Encrypt via Caddy) |
| `--email <email>`   | Initial admin email (default `admin@nutty.panel`)    |
| `--dry-run`         | Print the commands instead of running them           |
| `--help`            | Show the installer help                              |

Examples:

```bash
# Plain HTTP on port 80
bash infra/install.sh

# HTTPS with a domain
bash infra/install.sh --domain panel.example.com --email admin@example.com

# Preview what the installer would do
bash infra/install.sh --dry-run
```

## What happens

1. The OS package manager is detected (`apt` / `dnf` / `yum`).
2. Docker is installed if missing (via `get.docker.com`).
3. The repository is cloned into `~/nutty-panel` (or the current directory if it is already a checkout).
4. A `.env` file is generated with fresh secrets (`JWT_SECRET`, admin password).
5. `docker compose up -d --build` starts the panel.
6. The initial admin credentials are printed — **save them, they are shown only once**.

## First login

Open `http://localhost` (or `https://your-domain`) and sign in with the admin email and
password from the installer output. You are prompted to change the password after first login.

## Update

```bash
cd ~/nutty-panel
git pull
docker compose up -d --build
```