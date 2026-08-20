---
sidebar_position: 1
---

# Docker & resource limits

Every server instance runs in its own **Docker container**, isolated from the host
and from the other servers.

## Isolation

| Layer       | Guarantee                                      |
|-------------|------------------------------------------------|
| Filesystem  | Each server has its own volume; no shared world files |
| Network     | Each server has its own internal port          |
| Process     | Container process isolation (no cross-server access) |
| Resources   | CPU and memory limits via Docker (cgroups)     |

## Resource limits

Configured at server creation or edit:

- **Memory (MB)** — hard limit for the container. A server that exceeds it is killed
  by the kernel (OOM killer). Set it above the JVM heap size (`Xmx`).
- **CPU (%)** — soft cap as a percentage of one core (100 = one core, 400 = four cores).

### Choosing memory

| Server type             | Recommended |
|-------------------------|-------------|
| Vanilla (≤ 10 players)  | 1024 MB     |
| Paper with plugins      | 2048 MB     |
| Fabric / Forge modpacks | 3072–4096 MB |

## Containers under the hood

- Images: bundled per server type (`nutty-panel/vanilla`, `nutty-panel/paper`, …)
- Network: containers join the panel bridge network; the Smart Proxy and Playit
  agent connect to them on their internal port
- Lifecycle: `start` → `docker run`, `stop` → graceful stop, `kill` → force kill

## Debugging

Server console output is captured by the panel (Console tab). Container-level errors
(e.g. image pull failures, OOM kills) appear there too, prefixed with container messages.