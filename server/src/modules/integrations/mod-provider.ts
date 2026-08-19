export type ModProviderName = 'modrinth' | 'curseforge'

export type ModType = 'mod' | 'plugin' | 'datapack' | 'resourcepack' | 'modpack'

export interface ModSearchOptions {
  type?: ModType
  gameVersion?: string
  loader?: string
}

export interface ModSearchResult {
  projectId: string
  provider: ModProviderName
  name: string
  description?: string
  type: string
  downloads?: number
}

export interface ModInstallation {
  versionId: string
  fileName: string
  downloadUrl: string
}

export interface ModProject {
  projectId: string
  name: string
  description?: string
}

export interface ModProvider {
  readonly name: ModProviderName
  search(query: string, opts?: ModSearchOptions): Promise<ModSearchResult[]>
  getProject(projectId: string): Promise<ModProject>
  getInstallation(projectId: string, opts?: ModSearchOptions): Promise<ModInstallation>
  download(installation: ModInstallation): Promise<NodeJS.ReadableStream>
}

export const MOD_PROVIDER = Symbol('ModProvider')
export const MOD_PROVIDERS = Symbol('ModProviders')
