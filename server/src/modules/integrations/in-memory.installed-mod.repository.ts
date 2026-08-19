import type { InstalledMod } from './installed-mod'
import type { InstalledModRepository } from './installed-mod'

export class InMemoryInstalledModRepository implements InstalledModRepository {
  private readonly mods = new Map<string, InstalledMod>()

  async listByServer(serverId: string): Promise<InstalledMod[]> {
    return [...this.mods.values()]
      .filter((mod) => mod.serverId === serverId)
      .sort((a, b) => a.installedAt.getTime() - b.installedAt.getTime())
  }

  async find(id: string): Promise<InstalledMod | undefined> {
    return this.mods.get(id)
  }

  async save(mod: InstalledMod): Promise<InstalledMod> {
    this.mods.set(mod.id, mod)
    return mod
  }

  async delete(id: string): Promise<void> {
    this.mods.delete(id)
  }
}
