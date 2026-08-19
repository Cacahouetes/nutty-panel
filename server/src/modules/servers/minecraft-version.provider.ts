export interface MinecraftVersionProvider {
  isVersionSupported(type: string, version: string): Promise<boolean>
}

export const MINECRAFT_VERSION_PROVIDER = Symbol('MinecraftVersionProvider')
