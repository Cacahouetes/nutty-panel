---
sidebar_position: 1
---

# Create your first server

## 1. Create the server

From the dashboard, click **New server** and fill in:

| Field          | Description                                    |
|----------------|------------------------------------------------|
| Name           | Display name (e.g. `Survival`)                 |
| Type           | `Vanilla`, `Paper`, `Fabric`, `Forge` or `Bedrock` |
| Version        | Minecraft version (e.g. `1.21.1`)              |
| Memory (MB)    | RAM limit for the container (default 2048)     |
| CPU (%)        | CPU limit for the container (default 100)      |

The panel downloads the server jar, creates the container, and registers the server —
no manual configuration needed.

## 2. Start the server

Click **Start** on the server card. The state moves through `Starting` → `Running`.

While running, the dashboard shows:

- **Console** — live server output
- **Metrics** — CPU and memory usage
- **Players** — online players (Vanilla/Paper)

## 3. Connect with the Minecraft client

Use the address shown on the server card:

- `localhost:PORT` if you are on the same machine
- `SERVER_IP:PORT` from the outside (open the port in your firewall)
- The **Smart Proxy** address `<name>.<your-domain>:25565` when enabled — see
  [Smart Proxy](../advanced/smart-proxy.md)
- A **Playit.gg** address when the server is behind NAT — see
  [Playit.gg](../advanced/playit.md)

## 4. Lifecycle controls

| Action    | Description                                  |
|-----------|----------------------------------------------|
| **Start** | Boot the server container                    |
| **Stop**  | Graceful stop (`stop` command, world saved)  |
| **Restart** | Stop then start                            |
| **Kill**  | Force-kill the container (world may not save) |

## Managing an existing server

Use the **Edit** button to change memory, CPU, or version. Deleting a server removes
its container and files — make a backup first (see [Backups](./backups.md)).