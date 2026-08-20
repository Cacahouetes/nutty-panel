---
sidebar_position: 5
---

# Automatic lifecycle

Servers can start and stop themselves based on player activity, so idle worlds do
not consume resources.

## Auto-start

When enabled for a server, a **connection probe** watches the server port:

- a player trying to connect to a **stopped** server triggers an automatic start,
- the connection is held until the server is ready, then handed over.

Useful with the Smart Proxy: players who join `lobby.play.example.com:25565` wake
the Lobby server automatically.

## Auto-stop

When enabled, the server stops itself after a configurable **idle timeout** —
no players online for X minutes → graceful stop.

## Configuration

Each server has its own settings:

| Setting        | Description                                     |
|----------------|-------------------------------------------------|
| Auto-start     | Start the server when a connection probe hits it |
| Auto-stop      | Stop the server after inactivity                |
| Idle timeout   | Minutes without players before auto-stop (default 30) |

Configure from the server's **Settings** tab.

## Use cases

- **Budget VPS** — stop servers nobody plays on, keep RAM free
- **Event servers** — auto-start on the first join
- **Group play** — wake a shared world without manual intervention