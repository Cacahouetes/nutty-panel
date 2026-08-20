---
sidebar_position: 4
---

# Référence de configuration

Toute la configuration du panel vit dans le fichier `.env` à la racine du dépôt.
Le script d'installation le génère automatiquement avec des secrets frais.

## Cœur

| Variable               | Défaut                  | Description                                      |
|------------------------|-------------------------|--------------------------------------------------|
| `JWT_SECRET`           | `dev-secret-change-me`  | Signe les jetons d'accès API. **Utilisez `openssl rand -base64 32` en production.** |
| `PANEL_ADMIN_EMAIL`    | `admin@nutty.panel`     | Compte admin initial, créé au premier démarrage   |
| `PANEL_ADMIN_PASSWORD` | `change-me`             | Mot de passe admin initial                        |
| `PANEL_DOMAIN`         | *(vide)*                | Domaine public → HTTPS automatique via Caddy (Let's Encrypt). Vide = HTTP simple sur le port 80 |
| `DOCKER_HOST`          | `unix:///var/run/docker.sock` | Socket Docker utilisé par l'API        |
| `PORT`                 | `3000`                  | Port de l'API backend (dev uniquement)            |

## Smart Proxy

| Variable                  | Défaut        | Description                                       |
|---------------------------|---------------|---------------------------------------------------|
| `PROXY_PUBLIC_PORT`       | `25565`       | Port public unique pour tous les serveurs Minecraft |
| `PROXY_DOMAIN`            | `play.local`  | Suffixe d'hostname ; chaque serveur reçoit `<slug>.<PROXY_DOMAIN>` |
| `PROXY_DEFAULT_SERVER_ID` | *(vide)*      | Serveur recevant les connexions à hostname inconnu |
| `PROXY_HOST`              | `0.0.0.0`     | Adresse d'écoute du proxy                         |

## Playit.gg

| Variable             | Description                             |
|----------------------|-----------------------------------------|
| `PLAYIT_API_KEY`     | Clé API Playit.gg (tunnels agent)        |
| `PLAYIT_AGENT_BIN`   | Chemin du binaire de l'agent Playit      |
| `PLAYIT_AGENT_SECRET` | Secret d'authentification de l'agent    |
| `PLAYIT_API_BASE`    | URL de base de l'API Playit (défaut `https://api.playit.gg`) |

## Intégrations

| Variable             | Description                       |
|----------------------|-----------------------------------|
| `CURSEFORGE_API_KEY` | Clé API CurseForge pour les modpacks |
| `MODRINTH_TOKEN`     | Jeton Modrinth optionnel           |

## Authentification

- **JWT** — jetons d'accès à courte durée (15 min), rafraîchis automatiquement par le tableau de bord.
- **2FA** — codes TOTP optionnels, activés depuis la page de profil.
- **Clés API** — jetons longue durée pour scripts et intégrations, créés depuis la page de profil.

:::
Ne commitez jamais votre fichier `.env` — il est ignoré par git et contient des secrets.
:::