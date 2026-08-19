import type { Backup } from './backup'
import type { BackupPolicyStore } from './backup-policy.store'
import type { BackupsRepository } from './backups.repository'

export interface BackupSchedulerDeps {
  policyStore: BackupPolicyStore
  repository: BackupsRepository
  createBackup: (serverId: string, maxBackups: number) => Promise<Backup>
}

export interface BackupScheduler {
  runDueBackups(now?: Date): Promise<string[]>
}

export const BACKUP_SCHEDULER = Symbol('BackupScheduler')

export function createBackupScheduler(deps: BackupSchedulerDeps): BackupScheduler {
  return new DefaultBackupScheduler(deps)
}

class DefaultBackupScheduler implements BackupScheduler {
  constructor(private readonly deps: BackupSchedulerDeps) {}

  async runDueBackups(now = new Date()): Promise<string[]> {
    const policies = await this.deps.policyStore.list()
    const backedUp: string[] = []
    for (const policy of policies) {
      if (await this.isDue(policy.serverId, policy.intervalMinutes, now)) {
        await this.deps.createBackup(policy.serverId, policy.maxBackups)
        backedUp.push(policy.serverId)
      }
    }
    return backedUp
  }

  private async isDue(serverId: string, intervalMinutes: number, now: Date): Promise<boolean> {
    const backups = await this.deps.repository.listByServer(serverId)
    const last = backups.at(-1)
    if (!last) {
      return true
    }
    const elapsedMs = now.getTime() - last.createdAt.getTime()
    return elapsedMs >= intervalMinutes * 60_000
  }
}
