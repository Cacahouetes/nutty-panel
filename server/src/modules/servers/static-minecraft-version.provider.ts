import type { MinecraftVersionProvider } from './minecraft-version.provider'

const SUPPORTED_VERSIONS: Record<string, readonly string[]> = {
  vanilla: ['1.21.4', '1.21', '1.20.4', '1.20.1', '1.19.4'],
  paper: ['1.21.4', '1.21', '1.20.4'],
  spigot: ['1.21.4', '1.21', '1.20.4'],
  fabric: ['1.21.4', '1.21', '1.20.4'],
  forge: ['1.20.1', '1.19.4'],
  bedrock: ['1.20.81', '1.20.71'],
}

export class StaticMinecraftVersionProvider implements MinecraftVersionProvider {
  async isVersionSupported(type: string, version: string): Promise<boolean> {
    return (SUPPORTED_VERSIONS[type] ?? []).includes(version)
  }
}
