---
sidebar_position: 6
---

# FAQ

## The server won't start

- **Check the console** — the Console tab shows the real error (missing version,
  incompatible mod, port conflict).
- **Memory too low** — the JVM needs headroom above its heap: try 2048 MB minimum.
- **Port already in use** — another process (or another server) occupies the port.
- **Modpack mismatch** — the modpack's server type/version must match the server.
  See [Mods & modpacks](./guides/mods.md).

## Players can't connect

1. Is the server **running**? (Dashboard → status)
2. Is the **port open** in the host firewall?
   ```bash
   ufw allow 25565/tcp   # or your custom port
   ```
3. Are you using the right address? Server card shows it; with the
   [Smart Proxy](./advanced/smart-proxy.md) use `<name>.<domain>:25565`.
4. Behind NAT? Use a [Playit.gg tunnel](./advanced/playit.md) instead.

## "Can't connect to server" with the Smart Proxy

- The wildcard DNS `*.play.example.com` must point to your panel.
- `PROXY_PUBLIC_PORT` must be open (default `25565`).
- No default server → connections with unknown hostnames are refused:
  set `PROXY_DEFAULT_SERVER_ID` (see [Smart Proxy](./advanced/smart-proxy.md)).

## I forgot the admin password

Stop the panel, then set a new one in `.env` and remove the admin user row
(or delete the database file to re-bootstrap):

```bash
docker compose down
# edit .env → PANEL_ADMIN_PASSWORD
docker compose up -d
```

## Where are my server files?

Each server has its own directory under the panel's data volume. Use the
[File manager](./guides/files.md) in the dashboard — it's safer than editing
files directly on the host.

## Backups are failing

- Check disk space (`df -h`): backups need room for the world.
- The backup policy retention prunes old backups — keep it ≥ 1.
- Restore requires the server to be stopped.

## Playit agent is in error state

- `PLAYIT_AGENT_BIN` must point to a real binary and be executable.
- `PLAYIT_AGENT_SECRET` must match the agent's secret.
- Check `GET /api/playit/status` and the panel logs.

## Webhooks are not delivered

- Verify the URL accepts `POST` and returns 2xx.
- Failed deliveries are retried automatically; check the webhook details page.
- Payloads are HMAC-signed — if your endpoint validates signatures, the secret
  must match (see [Webhooks](./advanced/webhooks.md)).

## Updating the panel

```bash
cd ~/nutty-panel
git pull
docker compose up -d --build
```

Data and servers are preserved — they live in Docker volumes, not in the repo.

## Uninstalling

```bash
bash infra/uninstall.sh
```

This removes containers and volumes. Back up your worlds first!