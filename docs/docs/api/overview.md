---
sidebar_position: 1
---

# API overview

Nutty Panel exposes a **REST API** on the backend. The complete, always up-to-date
reference is served by the panel itself via Swagger UI:

> **`https://<your-panel>/api/docs`**

The OpenAPI document is generated live by NestJS — every endpoint, schema and error
is documented there. This page is a quick map of the API surface.

## Authentication

Most endpoints require a token:

- **JWT access tokens** — obtained via `POST /api/auth/login`, refreshed via
  `POST /api/auth/refresh`. Sent as `Authorization: Bearer <token>`.
- **API keys** — long-lived tokens created via `POST /api/auth/api-keys`
  (admin only). Same Bearer header.

### Roles

| Role    | Capabilities                                        |
|---------|-----------------------------------------------------|
| `admin` | Everything, including API keys and destructive actions |
| `moderator` | Start/stop servers, manage files            |
| `user`  | View and interact with owned servers                |

Role-restricted routes return **403** when the token lacks the required role.

## Endpoints map

### Auth — `/api/auth`

| Method | Route            | Description                        |
|--------|------------------|------------------------------------|
| POST   | `login`          | Authenticate, get JWT + refresh token |
| POST   | `refresh`        | Rotate tokens                      |
| POST   | `logout`         | Revoke the current session         |
| GET    | `me`             | Current user profile               |
| POST   | `2fa/setup`      | Generate a TOTP secret             |
| POST   | `2fa/enable`     | Enable 2FA with a code             |
| POST   | `2fa/disable`    | Disable 2FA                        |
| POST   | `api-keys`       | Create an API key (admin)          |
| GET    | `api-keys`       | List API keys (admin)              |
| DELETE | `api-keys/:id`   | Revoke an API key (admin)          |

### Servers — `/api/servers`

| Method | Route             | Description                     |
|--------|-------------------|---------------------------------|
| GET    | `/`               | List servers                    |
| GET    | `/:id`            | Server details                  |
| PATCH  | `/:id`            | Update server (memory, CPU…)    |
| DELETE | `/:id`            | Delete a server                 |
| POST   | `/:id/start`      | Start the server                |
| POST   | `/:id/stop`       | Graceful stop                   |
| POST   | `/:id/restart`    | Restart                         |
| POST   | `/:id/kill`       | Force kill                      |

### Backups — `/api`

| Method | Route                             | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | `servers/:serverId/backups`       | Create a backup          |
| GET    | `servers/:serverId/backups`       | List backups             |
| POST   | `backups/:backupId/restore`       | Restore a backup         |
| DELETE | `backups/:backupId`               | Delete a backup          |
| GET    | `servers/:serverId/backup-policy` | Get the backup policy    |
| PATCH  | `servers/:serverId/backup-policy` | Update the backup policy |

### Files — `/api/servers/:serverId/files`

| Method | Route          | Description             |
|--------|----------------|-------------------------|
| GET    | `content`      | Read a file             |
| PUT    | `content`      | Write a file            |
| POST   | `directories`  | Create a directory      |
| POST   | `upload`       | Upload a file           |
| GET    | `download`     | Download a file         |

### Integrations — `/api`

| Method | Route                                        | Description                 |
|--------|----------------------------------------------|-----------------------------|
| GET    | `integrations/:provider/search`              | Search CurseForge/Modrinth  |
| POST   | `servers/:serverId/integrations/install`     | Install a mod/modpack       |
| GET    | `servers/:serverId/integrations/installed`   | List installed content      |
| DELETE | `integrations/installed/:id`                 | Remove installed content    |

### Metrics — `/api`

| Method | Route                        | Description            |
|--------|------------------------------|------------------------|
| GET    | `servers/:serverId/metrics`  | Live CPU/RAM metrics   |

### Proxy — `/api/proxy`

| Method | Route      | Description                          |
|--------|------------|--------------------------------------|
| GET    | `status`   | Public port, listening state, routes |
| GET    | `routes`   | Routes with online status            |
| POST   | `refresh`  | Rebuild routes and restart (admin)   |

### Playit — `/api/playit`

| Method | Route                        | Description                 |
|--------|------------------------------|-----------------------------|
| GET    | `status`                     | Agent state + tunnel count  |
| GET    | `tunnels`                    | List tunnels                |
| GET    | `servers/:serverId/tunnels`  | Tunnel of a server          |
| POST   | `servers/:serverId/tunnels`  | Ensure a tunnel (admin)     |
| DELETE | `servers/:serverId/tunnels`  | Remove a tunnel (admin)     |

### Webhooks — `/api/webhooks`

| Method | Route      | Description                  |
|--------|------------|------------------------------|
| GET    | `events`   | List available events        |
| GET    | `:id`      | Webhook details + deliveries |
| DELETE | `:id`      | Delete a webhook             |

### Auto-lifecycle — `/api/servers/:serverId/auto-start`

| Method | Route | Description                        |
|--------|-------|------------------------------------|
| GET/POST/PATCH | `auto-start` | Read / enable / configure auto-start |
| (auto-stop settings follow the same pattern) | | |

## Errors

Errors use NestJS defaults: a JSON body with `statusCode`, `message` and `error`
(or `error` equal to the exception class name, e.g. `PlayitServerNotFoundError`).

| Status | Meaning                                    |
|--------|--------------------------------------------|
| 400    | Invalid payload                            |
| 401    | Missing/invalid token (or Playit auth failure) |
| 403    | Token lacks the required role              |
| 404    | Resource not found                         |
| 429    | Rate limited (login throttling, Playit API) |
| 502/503| Upstream failure (Playit API, agent)       |

## Try it

Start the panel and open `/api/docs` — every endpoint can be executed directly
from the browser with your token.