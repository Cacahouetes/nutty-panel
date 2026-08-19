import type { BackupPolicy } from './backup'

export interface BackupPolicyStore {
  get(serverId: string): Promise<BackupPolicy | undefined>
  list(): Promise<BackupPolicy[]>
  set(policy: BackupPolicy): Promise<BackupPolicy>
}

export const BACKUP_POLICY_STORE = Symbol('BackupPolicyStore')
