import { describe, it, expect } from '@jest/globals'
import type { Backup, BackupPolicy } from './backup'
import type { BackupPolicyStore } from './backup-policy.store'
import type { BackupsRepository } from './backups.repository'
import { createBackupScheduler, type BackupScheduler } from './backup.scheduler'

class FakePolicyStore implements BackupPolicyStore {
  policies: BackupPolicy[] = []

  async get(serverId: string): Promise<BackupPolicy | undefined> {
    return this.policies.find((policy) => policy.serverId === serverId)
  }

  async list(): Promise<BackupPolicy[]> {
    return this.policies
  }

  async set(policy: BackupPolicy): Promise<BackupPolicy> {
    const existing = this.policies.find((p) => p.serverId === policy.serverId)
    if (existing) {
      this.policies = this.policies.map((p) => (p.serverId === policy.serverId ? policy : p))
    } else {
      this.policies.push(policy)
    }
    return policy
  }
}

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

describe('BackupScheduler', () => {
  const NOW = new Date('2026-01-01T12:00:00Z')

  function build(): {
    scheduler: BackupScheduler
    policyStore: FakePolicyStore
    repository: FakeBackupsRepository
    createBackup: jest.Mock
  } {
    const policyStore = new FakePolicyStore()
    const repository = new FakeBackupsRepository()
    const createBackup = jest.fn(async (serverId: string) => ({
      id: `backup-${serverId}`,
      serverId,
      createdAt: new Date(),
      sizeBytes: 1,
      archiveKey: 'archive',
    }))
    const scheduler = createBackupScheduler({ policyStore, repository, createBackup })
    return { scheduler, policyStore, repository, createBackup }
  }

  it('backs up servers without any previous backup', async () => {
    const { scheduler, policyStore, createBackup } = build()
    await policyStore.set({ serverId: 'server-1', intervalMinutes: 60, maxBackups: 5 })

    const backedUp = await scheduler.runDueBackups(NOW)

    expect(backedUp).toEqual(['server-1'])
    expect(createBackup).toHaveBeenCalledWith('server-1', 5)
  })

  it('backs up a server whose last backup is older than the interval', async () => {
    const { scheduler, policyStore, repository, createBackup } = build()
    await policyStore.set({ serverId: 'server-1', intervalMinutes: 60, maxBackups: 3 })
    await repository.save({
      id: 'last',
      serverId: 'server-1',
      createdAt: new Date(NOW.getTime() - 90 * 60_000),
      sizeBytes: 1,
      archiveKey: 'a',
    })

    const backedUp = await scheduler.runDueBackups(NOW)

    expect(backedUp).toEqual(['server-1'])
    expect(createBackup).toHaveBeenCalledWith('server-1', 3)
  })

  it('skips a server whose last backup is newer than the interval', async () => {
    const { scheduler, policyStore, repository, createBackup } = build()
    await policyStore.set({ serverId: 'server-1', intervalMinutes: 60, maxBackups: 5 })
    await repository.save({
      id: 'last',
      serverId: 'server-1',
      createdAt: new Date(NOW.getTime() - 30 * 60_000),
      sizeBytes: 1,
      archiveKey: 'a',
    })

    const backedUp = await scheduler.runDueBackups(NOW)

    expect(backedUp).toEqual([])
    expect(createBackup).not.toHaveBeenCalled()
  })

  it('skips servers without a policy', async () => {
    const { scheduler, createBackup } = build()

    const backedUp = await scheduler.runDueBackups(NOW)

    expect(backedUp).toEqual([])
    expect(createBackup).not.toHaveBeenCalled()
  })
})
