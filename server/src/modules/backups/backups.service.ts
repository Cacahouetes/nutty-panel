import { randomUUID } from 'node:crypto'
import { DEFAULT_MAX_BACKUPS, type Backup } from './backup'
import type { ArchiveStore } from './archive.store'
import type { BackupsRepository } from './backups.repository'
import type { ServerDataAccess } from './server-data'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export interface BackupsServiceDeps {
  repository: BackupsRepository
  archiveStore: ArchiveStore
  serverData: ServerDataAccess
}

export interface BackupsService {
  createBackup(serverId: string, maxBackups?: number): Promise<Backup>
  listBackups(serverId: string): Promise<Backup[]>
  restore(backupId: string): Promise<void>
  deleteBackup(backupId: string): Promise<void>
  applyRetention(serverId: string, maxBackups: number): Promise<void>
}

export const BACKUPS_SERVICE = Symbol('BackupsService')

export function createBackupsService(deps: BackupsServiceDeps): BackupsService {
  return new DefaultBackupsService(deps)
}

class DefaultBackupsService implements BackupsService {
  constructor(private readonly deps: BackupsServiceDeps) {}

  async createBackup(serverId: string, maxBackups = DEFAULT_MAX_BACKUPS): Promise<Backup> {
    const source = await this.deps.serverData.exportData(serverId)
    const stored = await this.deps.archiveStore.saveArchive(serverId, source)
    const backup: Backup = {
      id: randomUUID(),
      serverId,
      createdAt: new Date(),
      sizeBytes: stored.sizeBytes,
      archiveKey: stored.key,
    }
    const saved = await this.deps.repository.save(backup)
    await this.applyRetention(serverId, maxBackups)
    return saved
  }

  async listBackups(serverId: string): Promise<Backup[]> {
    return this.deps.repository.listByServer(serverId)
  }

  async restore(backupId: string): Promise<void> {
    const backup = await this.mustFind(backupId)
    const stream = await this.deps.archiveStore.openArchive(backup.archiveKey)
    await this.deps.serverData.importData(backup.serverId, stream)
  }

  async deleteBackup(backupId: string): Promise<void> {
    const backup = await this.mustFind(backupId)
    await this.deps.archiveStore.deleteArchive(backup.archiveKey)
    await this.deps.repository.delete(backupId)
  }

  async applyRetention(serverId: string, maxBackups: number): Promise<void> {
    const backups = await this.deps.repository.listByServer(serverId)
    const sorted = [...backups].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const excess = sorted.slice(0, Math.max(0, sorted.length - maxBackups))
    for (const backup of excess) {
      await this.deps.archiveStore.deleteArchive(backup.archiveKey)
      await this.deps.repository.delete(backup.id)
    }
  }

  private async mustFind(backupId: string): Promise<Backup> {
    const backup = await this.deps.repository.find(backupId)
    if (!backup) {
      throw new NotFoundError(`backup not found: ${backupId}`)
    }
    return backup
  }
}
