---
sidebar_position: 4
---

# File manager

The **Files** tab gives you a web file manager for each server directory:
configs, plugins, worlds, logs and everything else.

## Features

- **Browse** — navigate the server directory tree
- **View & edit** — read and edit text files (e.g. `server.properties`, `paper.yml`)
  with a built-in editor
- **Upload** — upload files from your computer (e.g. a plugin jar)
- **Directories** — create and remove folders
- **Download** — download any file

## Tips

- Always stop the server before replacing configs or world files.
- `server.properties` is hot-reloaded by most server types, but a restart is safer.
- After uploading a plugin, verify the file in the **Mods / Plugins** list and restart
  the server.

## Paths

Each server has its own isolated directory. You never cross server boundaries —
containers also enforce this with separate mounts.