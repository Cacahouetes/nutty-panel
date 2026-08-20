---
sidebar_position: 3
---

# Installation manuelle

Vous préférez tout faire vous-même ? Voici ce que fait le script, étape par étape.

## 1. Installer Docker

Sur Ubuntu/Debian :

```bash
curl -fsSL https://get.docker.com | sh
```

Vérifiez le plugin Compose :

```bash
docker compose version
```

## 2. Cloner le dépôt

```bash
git clone https://github.com/Cacahouetes/nutty-panel.git ~/nutty-panel
cd ~/nutty-panel
```

## 3. Configurer l'environnement

Copiez l'exemple et générez de vrais secrets :

```bash
cp .env.example .env
# Générez un secret JWT robuste :
openssl rand -base64 32 | tr -d '\n'
```

Modifiez `.env` :

| Variable               | Requis | Description                                      |
|------------------------|--------|--------------------------------------------------|
| `JWT_SECRET`           | oui    | Secret de signature des jetons API               |
| `PANEL_ADMIN_EMAIL`    | oui    | Email admin initial (créé au premier démarrage)  |
| `PANEL_ADMIN_PASSWORD` | oui    | Mot de passe admin initial                       |
| `PANEL_DOMAIN`         | non    | Domaine public pour le HTTPS via Caddy           |
| `DOCKER_HOST`          | non    | Socket Docker (défaut `unix:///var/run/docker.sock`) |
| `CURSEFORGE_API_KEY`   | non    | Intégration CurseForge                           |
| `PLAYIT_API_KEY`       | non    | Intégration Playit.gg                            |
| `PROXY_PUBLIC_PORT`    | non    | Port public du Smart Proxy (défaut `25565`)      |
| `PROXY_DOMAIN`         | non    | Suffixe d'hostname pour le routage Smart Proxy   |

Voir [Configuration](./configuration.md) pour la référence complète.

## 4. Démarrer le panel

```bash
docker compose up -d --build
```

## 5. Se connecter

Ouvrez `http://localhost` et utilisez les identifiants de `.env`.

## Désinstallation

```bash
bash infra/uninstall.sh
```