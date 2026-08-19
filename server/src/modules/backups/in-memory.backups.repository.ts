import type { Backup } from './backup'
import type { BackupsRepository } from './backups.repository'

export class InMemoryBackupsRepository implements BackupsRepository {
  private readonly backups = new Map<string, Backup>()

  async listByServer(serverId: string): Promise<Backup[]> {
    return [...this.backups.values()]
      .filter((backup) => backup.serverId === serverId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  async find(backupId: string): Promise<Backup | undefined> {
    return this.backups.get(backupId)
  }

  async save(backup: Backup): Promise<Backup> {
    this.backups.set(backup.id, backup)
    return backup
  }

  async delete(backupId: string): Promise<void> {
    this.backups.delete(backupId)
  }
}
