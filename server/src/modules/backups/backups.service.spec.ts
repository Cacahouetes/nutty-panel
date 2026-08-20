import { describe, it, expect } from '@jest/globals'
import { Readable } from 'node:stream'
import { createBackupsService, NotFoundError, type BackupsService } from './backups.service'
import type { Backup } from './backup'
import type { BackupsRepository } from './backups.repository'
import type { ArchiveStore } from './archive.store'
import type { ServerDataAccess } from './server-data'
import type { EventBus } from '../events/event-bus'
import type { AppEvent } from '../events/event'

class FakeBackupsRepository implements BackupsRepository {
  backups: Backup[] = []

  async listByServer(serverId: string): Promise<Backup[]> {
    return this.backups
      .filter((backup) => backup.serverId === serverId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  async find(backupId: string): Promise<Backup | undefined> {
    return this.backups.find((backup) => backup.id === backupId)
  }

  async save(backup: Backup): Promise<Backup> {
    this.backups.push(backup)
    return backup
  }

  async delete(backupId: string): Promise<void> {
    this.backups = this.backups.filter((backup) => backup.id !== backupId)
  }
}

class FakeArchiveStore implements ArchiveStore {
  archives = new Map<string, Buffer>()
  deleted: string[] = []
  private nextKey = 1

  async saveArchive(serverId: string, source: NodeJS.ReadableStream) {
    const chunks: Buffer[] = []
    for await (const chunk of source as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk))
    }
    const content = Buffer.concat(chunks)
    const key = `archive-${this.nextKey++}`
    this.archives.set(key, content)
    return { key, sizeBytes: content.length }
  }

  async openArchive(key: string): Promise<NodeJS.ReadableStream> {
    return Readable.from(this.archives.get(key) ?? [])
  }

  async deleteArchive(key: string): Promise<void> {
    this.deleted.push(key)
    this.archives.delete(key)
  }
}

class FakeServerData implements ServerDataAccess {
  exported: string[] = []
  imported: { serverId: string; content: string }[] = []

  async exportData(serverId: string): Promise<NodeJS.ReadableStream> {
    this.exported.push(serverId)
    return Readable.from([`data-${serverId}`])
  }

  async importData(serverId: string, stream: NodeJS.ReadableStream): Promise<void> {
    const chunks: Buffer[] = []
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(chunk)
    }
    this.imported.push({ serverId, content: Buffer.concat(chunks).toString() })
  }
}

function buildService(): {
  service: BackupsService
  repository: FakeBackupsRepository
  archiveStore: FakeArchiveStore
  serverData: FakeServerData
} {
  const repository = new FakeBackupsRepository()
  const archiveStore = new FakeArchiveStore()
  const serverData = new FakeServerData()
  const service = createBackupsService({ repository, archiveStore, serverData })
  return { service, repository, archiveStore, serverData }
}

class RecordingEventBus implements EventBus {
  readonly emitted: AppEvent[] = []

  emit(event: AppEvent): void {
    this.emitted.push(event)
  }

  subscribe(): () => void {
    return () => {}
  }
}

function buildServiceWithEvents(): {
  service: BackupsService
  events: RecordingEventBus
} {
  const repository = new FakeBackupsRepository()
  const archiveStore = new FakeArchiveStore()
  const serverData = new FakeServerData()
  const events = new RecordingEventBus()
  const service = createBackupsService({ repository, archiveStore, serverData, events })
  return { service, events }
}

describe('BackupsService', () => {
  it('creates a backup by exporting server data into the archive store', async () => {
    const { service, repository, archiveStore, serverData } = buildService()

    const backup = await service.createBackup('server-1')

    expect(serverData.exported).toEqual(['server-1'])
    expect(backup.serverId).toBe('server-1')
    expect(backup.sizeBytes).toBe('data-server-1'.length)
    expect(backup.archiveKey).toBe('archive-1')
    expect(archiveStore.archives.get('archive-1')?.toString()).toBe('data-server-1')
    expect(await repository.listByServer('server-1')).toHaveLength(1)
  })

  it('lists backups of a server', async () => {
    const { service } = buildService()
    await service.createBackup('server-1')
    await service.createBackup('server-1')
    await service.createBackup('server-2')

    const backups = await service.listBackups('server-1')
    expect(backups).toHaveLength(2)
  })

  it('restores a backup by importing the stored archive', async () => {
    const { service, serverData } = buildService()
    const backup = await service.createBackup('server-1')

    await service.restore(backup.id)

    expect(serverData.imported).toEqual([{ serverId: 'server-1', content: 'data-server-1' }])
  })

  it('rejects restoring an unknown backup', async () => {
    const { service } = buildService()
    await expect(service.restore('missing')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('deletes the archive and the record', async () => {
    const { service, repository, archiveStore } = buildService()
    const backup = await service.createBackup('server-1')

    await service.deleteBackup(backup.id)

    expect(archiveStore.deleted).toEqual([backup.archiveKey])
    expect(await repository.listByServer('server-1')).toHaveLength(0)
  })

  it('rejects deleting an unknown backup', async () => {
    const { service } = buildService()
    await expect(service.deleteBackup('missing')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('keeps only the maxBackups most recent backups when applying retention', async () => {
    const { service, repository, archiveStore } = buildService()
    const createdAt = new Date('2026-01-01T00:00:00Z')
    const seeded: Backup[] = [0, 1, 2, 3, 4].map((i) => ({
      id: `backup-${i}`,
      serverId: 'server-1',
      createdAt: new Date(createdAt.getTime() + i * 60_000),
      sizeBytes: 1,
      archiveKey: `archive-${i}`,
    }))
    for (const backup of seeded) {
      await repository.save(backup)
      archiveStore.archives.set(backup.archiveKey, Buffer.from('x'))
    }

    await service.applyRetention('server-1', 2)

    const remaining = await repository.listByServer('server-1')
    expect(remaining.map((b) => b.id)).toEqual(['backup-3', 'backup-4'])
    expect(archiveStore.deleted).toEqual(['archive-0', 'archive-1', 'archive-2'])
    expect(archiveStore.archives.has('archive-0')).toBe(false)
  })

  it('applies retention after creating a backup', async () => {
    const { service, repository, archiveStore } = buildService()
    for (let i = 0; i < 4; i += 1) {
      await service.createBackup('server-1')
    }

    await service.createBackup('server-1', 3)

    expect(await repository.listByServer('server-1')).toHaveLength(3)
    expect(archiveStore.deleted).toEqual(['archive-1', 'archive-2'])
  })

  describe('events', () => {
    it('emits backup.completed with the backup payload', async () => {
      const { service, events } = buildServiceWithEvents()

      const backup = await service.createBackup('server-1')

      expect(events.emitted).toContainEqual(
        expect.objectContaining({
          type: 'backup.completed',
          data: { backupId: backup.id, serverId: 'server-1', sizeBytes: backup.sizeBytes },
        }),
      )
    })

    it('emits backup.failed and rethrows when export fails', async () => {
      const repository = new FakeBackupsRepository()
      const archiveStore = new FakeArchiveStore()
      const failingServerData: ServerDataAccess = {
        async exportData(): Promise<NodeJS.ReadableStream> {
          throw new Error('export exploded')
        },
        async importData(): Promise<void> {},
      }
      const events = new RecordingEventBus()
      const service = createBackupsService({
        repository,
        archiveStore,
        serverData: failingServerData,
        events,
      })

      await expect(service.createBackup('server-1')).rejects.toThrow('export exploded')

      expect(events.emitted).toContainEqual(
        expect.objectContaining({
          type: 'backup.failed',
          data: { backupId: expect.any(String), serverId: 'server-1', error: 'export exploded' },
        }),
      )
    })
  })
})
