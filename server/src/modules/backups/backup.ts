export interface Backup {
  id: string
  serverId: string
  createdAt: Date
  sizeBytes: number
  archiveKey: string
}

export interface BackupPolicy {
  serverId: string
  intervalMinutes: number
  maxBackups: number
}

export const DEFAULT_MAX_BACKUPS = 5
export const DEFAULT_INTERVAL_MINUTES = 60
export const MIN_INTERVAL_MINUTES = 1
