---
sidebar_position: 1
---

# Introduction

**Nutty Panel** est un panneau de contrôle open-source et auto-hébergé pour serveurs
Minecraft. Conçu pour être simple pour les débutants et puissant pour les experts.

## Ce que fait Nutty Panel

- **Créez et gérez des serveurs Minecraft** — instances Vanilla, Paper, Fabric, Forge
  et Bedrock exécutées dans des conteneurs Docker isolés avec limites CPU et mémoire.
- **Contrôle complet du cycle de vie** — démarrage, arrêt, redémarrage et kill,
  métriques en direct (CPU/RAM), console et gestion des fichiers via le tableau de bord web.
- **Backups automatiques** — manuels ou planifiés, avec restauration en un clic.
- **Mods et modpacks** — installez des plugins et modpacks directement depuis
  CurseForge et Modrinth.
- **Smart Proxy** — exposez tous vos serveurs via un seul port public ; les joueurs
  sont routés vers le bon serveur selon l'hostname utilisé.
- **Tunnels Playit.gg** — exposez des serveurs derrière NAT ou pare-feu sans ouvrir de port.
- **Webhooks** — notifiez Discord, Slack ou tout endpoint HTTP sur les événements du panel.

## Architecture

| Couche      | Technologie                  |
|-------------|------------------------------|
| Frontend    | React + TypeScript + Tailwind |
| Backend     | Node.js + NestJS             |
| Base de données | SQLite (MVP)              |
| Conteneurs  | Docker                       |
| Proxy       | Caddy (HTTPS) / Smart Proxy  |

## Structure du dépôt

```
client/          — Frontend React (SPA via Vite)
server/          — API backend NestJS
infra/           — Dockerfiles, scripts d'installation, configs Caddy/Nginx
docs/            — ce site de documentation (Docusaurus)
```

## Prochaines étapes

- [Installation](./installation/quickstart.md) — faites tourner le panel en quelques minutes.
- [Guide utilisateur](./guides/first-server.md) — créez votre premier serveur.
- [FAQ](./faq.md) — problèmes courants et solutions.