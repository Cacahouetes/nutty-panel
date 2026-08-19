# ADR 002: Architecture des Modules

## Status

Proposed

## Context

Nutty Panel gère plusieurs domaines fonctionnels: serveurs Minecraft, Docker, fichiers, sauvegardes, authentification, intégrations (CurseForge, Modrinth, Playit.gg), webhooks, etc. Nous devons définir une architecture modulaire claire.

## Decision

Nous adoptons l'architecture NestJS modulaire suivante:

```
server/src/
  modules/
    servers/          — Création, lifecycle, console, gestion des instances
    docker/           — Orchestration des conteneurs Docker
    files/            — Éditeur de fichiers, upload/download
    backups/          — Planification et exécution des sauvegardes
    auth/             — Authentification (JWT, 2FA, clés API)
    users/            — Gestion des utilisateurs et rôles
    metrics/          — Monitoring CPU/RAM/joueurs
    proxy/            — Smart Proxy / gestion des ports
    integrations/
      curseforge/     — Téléchargement de mods/modpacks
      modrinth/       — Téléchargement de datapacks/plugins
      playit/         — Gestion des tunnels Playit.gg
    webhooks/         — Notifications Discord/Slack
    settings/         — Configuration globale du panel
```

Chaque module expose un **Module API** (NestJS module) et est testable indépendamment via des tests d'intégration.

## Consequences

- Chaque module est un deep module: interface NestJS small, implémentation large
- Les tests couvrent les seams publics (controllers, services)
- Les intégrations tierces sont isolées dans des plugins
