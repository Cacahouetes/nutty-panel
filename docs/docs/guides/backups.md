---
sidebar_position: 3
---

# Backups

Backups snapshot a server's files and world data so you can restore it later.

## Manual backup

1. Open the server, then the **Backups** tab.
2. Click **Create backup**.
3. The panel stops the server briefly (or uses a live snapshot), archives the files,
   and stores the backup.

## Restoring a backup

1. Open the **Backups** tab and select a backup.
2. Click **Restore**.
3. The server is stopped, the current files are replaced with the backup, and you can
   start it again.

Restoring is destructive for the current state — the current files are replaced.
If you are unsure, create a backup of the current state first.

## Automatic backups (policy)

A per-server **backup policy** controls scheduled backups:

- **Enabled** — run backups automatically
- **Interval** — how often a backup is created (e.g. every 6 hours)
- **Retention** — how many backups to keep (oldest are pruned)

Set it from the server's **Backups** tab → *Policy*.

## Storage

Backups are stored in the panel's data directory. Remote storage (S3/SFTP) is on the
roadmap; for now you can download a backup and copy it elsewhere for safe keeping.