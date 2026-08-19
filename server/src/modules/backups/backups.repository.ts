import type { Backup } from './backup'

export interface BackupsRepository {
  listByServer(serverId: string): Promise<Backup[]>
  find(backupId: string): Promise<Backup | undefined>
  save(backup: Backup): Promise<Backup>
  delete(backupId: string): Promise<void>
}

export const BACKUPS_REPOSITORY = Symbol('BackupsRepository')
