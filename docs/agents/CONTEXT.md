# Nutty Panel — Domain Context

## Core Concepts

**Panel** — The web application itself: frontend dashboard + backend API.

**Server Instance** — A running Minecraft server managed by Nutty Panel. Each instance has its own files, ports, and lifecycle.

**Server Type** — The flavor of Minecraft server (Vanilla, Paper, Spigot, Fabric, Forge, Bedrock).

**Node** — A host machine (physical or virtual) that runs Docker containers for server instances. Nutty Panel can manage multiple nodes.

**Docker Image** — The container image used to run a server instance. Nutty Panel bundles default images and lets users bring custom ones.

**Smart Proxy** — A reverse proxy that routes players to the correct server instance based on the port they connect to. All server instances listen on a single public port range.

**Tunnels** — Playit.gg or Cloudflare Tunnel integrations that expose servers behind NAT/firewall.

**Modpack** — A collection of mods/plugins/configs downloaded as a bundle from CurseForge or Modrinth.

**Backup** — A snapshot of a server instance's files and data, stored locally or remotely (S3, SFTP).

**Schedule** — A time-based trigger for recurring actions (start, stop, backup, restart).

**Resource Limits** — CPU, memory, and disk quotas applied per server instance via Docker cgroups.

## User Roles

**Owner** — Full access to all panel features, user management, billing.
**Admin** — Manages servers, users, and configuration.
**Moderator** — Can start/stop servers and manage files.
**User** — Can view and interact with servers they own.

## API Concepts

**API Key** — A secret token for programmatic access to the panel API.
**Webhook** — An HTTP callback triggered by panel events (server started, backup completed, etc.).

## Lifecycle States

**Stopped** — Server process is not running.
**Starting** — Server is initializing (Docker container starting).
**Running** — Server is online and accepting players.
**Stopping** — Server is gracefully shutting down.
**Error** — Server failed to start or crashed.
