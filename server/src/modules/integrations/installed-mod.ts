import type { ModProviderName } from './mod-provider'

export interface InstalledMod {
  id: string
  serverId: string
  provider: ModProviderName
  projectId: string
  projectName: string
  versionId: string
  fileName: string
  targetPath: string
  installedAt: Date
}

export interface InstalledModRepository {
  listByServer(serverId: string): Promise<InstalledMod[]>
  find(id: string): Promise<InstalledMod | undefined>
  save(mod: InstalledMod): Promise<InstalledMod>
  delete(id: string): Promise<void>
}

export const INSTALLED_MOD_REPOSITORY = Symbol('InstalledModRepository')
