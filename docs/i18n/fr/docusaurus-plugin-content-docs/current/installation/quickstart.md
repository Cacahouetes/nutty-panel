---
sidebar_position: 2
---

# Démarrage rapide (installation en une commande)

Le script d'installation clone le dépôt, génère des secrets sécurisés et démarre
le panel avec Docker.

## Installation

```bash
bash <(curl -s https://nutty-panel.com/install.sh)
```

Ou localement depuis un checkout :

```bash
bash infra/install.sh
```

### Options

| Option                | Description                                          |
|-----------------------|------------------------------------------------------|
| `--domain <host>`     | Domaine public pour le HTTPS automatique (Let's Encrypt via Caddy) |
| `--email <email>`     | Email admin initial (défaut `admin@nutty.panel`)     |
| `--dry-run`           | Affiche les commandes sans les exécuter              |
| `--help`              | Affiche l'aide du script                             |

Exemples :

```bash
# HTTP simple sur le port 80
bash infra/install.sh

# HTTPS avec un domaine
bash infra/install.sh --domain panel.example.com --email admin@example.com

# Prévisualiser ce que ferait le script
bash infra/install.sh --dry-run
```

## Ce qui se passe

1. Le gestionnaire de paquets de l'OS est détecté (`apt` / `dnf` / `yum`).
2. Docker est installé si absent (via `get.docker.com`).
3. Le dépôt est cloné dans `~/nutty-panel` (ou le dossier courant si c'est déjà un checkout).
4. Un fichier `.env` est généré avec des secrets frais (`JWT_SECRET`, mot de passe admin).
5. `docker compose up -d --build` démarre le panel.
6. Les identifiants admin initiaux sont affichés — **conservez-les, ils ne sont montrés qu'une fois**.

## Première connexion

Ouvrez `http://localhost` (ou `https://votre-domaine`) et connectez-vous avec l'email
et le mot de passe admin affichés par le script. Un changement de mot de passe est
demandé après la première connexion.

## Mise à jour

```bash
cd ~/nutty-panel
git pull
docker compose up -d --build
```