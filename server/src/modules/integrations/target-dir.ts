import type { ServerType } from '../servers/server-instance'
import type { ModType } from './mod-provider'

export function resolveTargetDirectory(serverType: ServerType, modType?: ModType): string {
  if (serverType === 'bedrock') {
    return 'behavior_packs'
  }
  switch (modType) {
    case 'datapack':
      return 'datapacks'
    case 'resourcepack':
      return 'resourcepacks'
    case 'plugin':
      return 'plugins'
    case 'modpack':
      return 'modpacks'
    case 'mod':
      return 'mods'
    default:
      return serverType === 'vanilla' || serverType === 'spigot' || serverType === 'paper'
        ? 'plugins'
        : 'mods'
  }
}
