import type { BackupPolicy } from './backup'
import type { BackupPolicyStore } from './backup-policy.store'

export class InMemoryBackupPolicyStore implements BackupPolicyStore {
  private readonly policies = new Map<string, BackupPolicy>()

  async get(serverId: string): Promise<BackupPolicy | undefined> {
    return this.policies.get(serverId)
  }

  async list(): Promise<BackupPolicy[]> {
    return [...this.policies.values()]
  }

  async set(policy: BackupPolicy): Promise<BackupPolicy> {
    this.policies.set(policy.serverId, policy)
    return policy
  }
}
