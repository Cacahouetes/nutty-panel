---
sidebar_position: 2
---

# Smart Proxy

The Smart Proxy exposes **all your servers through one public port** (default `25565`).
Players connect to a hostname, and the proxy routes them to the right server
automatically — no need to remember per-server ports.

## How it works

1. A Minecraft client sends its **handshake** (which hostname it is connecting to).
2. The proxy parses the handshake and resolves the target server:
   `hostname → requested port → default server → connection refused`.
3. The proxy opens a connection to the target server's internal port and tunnels
   the client traffic (including the original handshake).

## Addresses

Each server gets a hostname built from its slugified name:

```
<server-name>.<PROXY_DOMAIN>
```

| Server name    | PROXY_DOMAIN      | Address                             |
|----------------|-------------------|-------------------------------------|
| `Lobby`        | `play.example.com` | `lobby.play.example.com:25565`      |
| `Survival Deux`| `play.example.com` | `survival-deux.play.example.com:25565` |

To use it, point a wildcard DNS record at your panel:

```
*.play.example.com  →  A  <panel-server-ip>
```

## Configuration

| Variable                  | Default       | Description                                  |
|---------------------------|---------------|----------------------------------------------|
| `PROXY_PUBLIC_PORT`       | `25565`       | Single public Minecraft port                 |
| `PROXY_DOMAIN`            | `play.local`  | Hostname suffix (must be a domain you control) |
| `PROXY_DEFAULT_SERVER_ID` | *(empty)*     | Server receiving connections with unknown hostnames (the classic `25565` port connection) |
| `PROXY_HOST`              | `0.0.0.0`     | Bind address                                 |

Changes take effect after restarting the panel (`docker compose restart server`).

## Dashboard

The **Proxy** section of the dashboard shows:

- listening state and public port
- the route of every server (`hostnames`, target, whether it is the default)
- live **online/offline** status per route

## Behavior details

- A connection with **no matching hostname** and **no default server** is refused.
- **Stopped servers** appear offline; the connection is still routed and the server
  simply does not answer (or refuses).
- The proxy supports **fragmented handshakes** (bytes split across TCP packets).
- The first connection triggers route resolution; subsequent traffic is piped both ways.

## Troubleshooting

| Symptom                    | Fix                                            |
|----------------------------|------------------------------------------------|
| `Can't connect to server`  | Check `PROXY_DOMAIN` DNS wildcard + `PROXY_PUBLIC_PORT` open in the firewall |
| Server not listed          | Proxy routes are rebuilt when the panel starts; use **Refresh** in the dashboard |
| Unknown-hostname connections fail | Set `PROXY_DEFAULT_SERVER_ID` to a server |