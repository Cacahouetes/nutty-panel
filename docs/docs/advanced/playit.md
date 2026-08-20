---
sidebar_position: 3
---

# Playit.gg tunnels

[Playit.gg](https://playit.gg) provides free tunnels that expose your Minecraft servers
to the internet **without opening any port** — ideal when the panel runs behind NAT,
CGNAT, or a firewall you do not control.

## How it works

- A small **agent** runs alongside the panel and maintains a tunnel to the Playit
  network.
- Each server gets a public address like `12345.playit.gg:25565`.
- Players connect to that address; Playit forwards traffic to the agent, which
  forwards it to the server container.

## Prerequisites

1. A Playit.gg account.
2. Configure in `.env`:

| Variable              | Description                            |
|-----------------------|----------------------------------------|
| `PLAYIT_API_KEY`      | Playit.gg API key                      |
| `PLAYIT_AGENT_BIN`    | Path to the Playit agent binary        |
| `PLAYIT_AGENT_SECRET` | Secret for authenticating the agent    |
| `PLAYIT_API_BASE`     | API base URL (default `https://api.playit.gg`) |

3. Restart the panel.

## Creating a tunnel

From the dashboard, open the server's **Tunnels** tab and click **Create tunnel**.
The panel:

1. registers the tunnel with the Playit API,
2. starts the agent if needed,
3. shows the public `host:port` to share with players.

The tunnel address also appears on the server card.

## Managing tunnels

- **List** — all configured tunnels with their public addresses
- **Remove** — deletes the tunnel (players lose access immediately)
- **Status** — agent state (`running`, `stopped`, `error`, `disabled`) and tunnel count

## Use with the Smart Proxy

Tunnels and the Smart Proxy are independent: the proxy is for players reaching your
panel's IP on port 25565; tunnels are for players reaching the panel through Playit.
You can use both at once.

## Troubleshooting

| Symptom                     | Fix                                        |
|-----------------------------|--------------------------------------------|
| Agent `error` / `disabled`  | Check `PLAYIT_AGENT_BIN` exists and `PLAYIT_AGENT_SECRET` is set |
| Tunnel 404 on Playit API    | Check `PLAYIT_API_KEY`                     |
| Players cannot connect      | Verify the server is running and the tunnel address is the one from the dashboard |