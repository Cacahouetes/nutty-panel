---
sidebar_position: 2
---

# Mods, plugins and modpacks

Nutty Panel integrates with **CurseForge** and **Modrinth** to install mods and
modpacks without touching the filesystem.

## Prerequisites

- A **CurseForge API key** in `.env` (`CURSEFORGE_API_KEY`) for CurseForge content.
- Modrinth works out of the box (no key required).

## Installing a modpack

1. Open the server, then the **Mods / Modpacks** tab.
2. Pick a provider (**CurseForge** or **Modrinth**) and search.
3. Select a modpack and click **Install**.
4. The panel downloads it, unpacks it into the server directory, and installs
   the matching server type if needed.

Installation happens in the background; the server must be **stopped** while installing.

## Installing a single mod or plugin

The same search flow works for individual mods (Fabric/Forge) and plugins (Paper):
search, select, install. Files land in `mods/` or `plugins/` respectively.

## Managing installed content

The **Installed** tab lists what is installed per server. You can remove an item
directly from there.

## Compatibility

- **Paper/Spigot** — plugins (`.jar` in `plugins/`)
- **Fabric** — mods (`.jar` in `mods/`, with fabric loader)
- **Forge** — mods (`.jar` in `mods/`)
- **Vanilla/Bedrock** — modpacks not supported; use the [Files](./files.md) manager for manual content

:::note
The server type and version of the modpack must match your server, otherwise the
server may refuse to start.
:::