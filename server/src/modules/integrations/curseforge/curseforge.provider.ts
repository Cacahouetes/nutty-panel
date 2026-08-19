import { NotFoundError, ValidationError } from '../integrations.errors'
import type { HttpClient } from '../http-client'
import type {
  ModInstallation,
  ModProject,
  ModProvider,
  ModSearchOptions,
  ModSearchResult,
} from '../mod-provider'

const BASE_URL = 'https://api.curseforge.com/v1'
const GAME_ID = 432

const CLASS_IDS: Record<string, number> = {
  mod: 6,
  plugin: 12,
  datapack: 6945,
  resourcepack: 6552,
  modpack: 4471,
}

const LOADER_TYPE_IDS: Record<string, number> = {
  forge: 1,
  fabric: 4,
  neoforge: 5,
  quilt: 6,
}

export interface CurseForgeProviderDeps {
  http: HttpClient
  apiKey?: string
  baseUrl?: string
}

export class CurseForgeProvider implements ModProvider {
  readonly name = 'curseforge' as const
  private readonly baseUrl: string

  constructor(private readonly deps: CurseForgeProviderDeps) {
    this.baseUrl = deps.baseUrl ?? BASE_URL
  }

  async search(query: string, opts: ModSearchOptions = {}): Promise<ModSearchResult[]> {
    this.requireApiKey()
    const params = new URLSearchParams({ gameId: String(GAME_ID), searchFilter: query })
    const classId = opts.type ? CLASS_IDS[opts.type] : undefined
    if (classId) params.set('classId', String(classId))
    const data = (await this.deps.http.getJson(
      `${this.baseUrl}/mods/search?${params.toString()}`,
      this.headers(),
    )) as { data?: Array<{ id: number; name: string; summary?: string; downloadCount: number }> }
    return (data.data ?? []).map((mod) => ({
      projectId: String(mod.id),
      provider: 'curseforge',
      name: mod.name,
      description: mod.summary,
      type: opts.type ?? 'mod',
      downloads: mod.downloadCount,
    }))
  }

  async getProject(projectId: string): Promise<ModProject> {
    this.requireApiKey()
    const data = (await this.deps.http.getJson(
      `${this.baseUrl}/mods/${projectId}`,
      this.headers(),
    )) as { data: { name: string; summary?: string } }
    return { projectId, name: data.data.name, description: data.data.summary }
  }

  async getInstallation(projectId: string, opts: ModSearchOptions = {}): Promise<ModInstallation> {
    this.requireApiKey()
    const params = new URLSearchParams()
    if (opts.gameVersion) params.set('gameVersion', opts.gameVersion)
    const loaderTypeId = opts.loader ? LOADER_TYPE_IDS[opts.loader] : undefined
    if (loaderTypeId) params.set('modLoaderType', String(loaderTypeId))
    const query = params.toString()
    const data = (await this.deps.http.getJson(
      `${this.baseUrl}/mods/${projectId}/files${query ? `?${query}` : ''}`,
      this.headers(),
    )) as {
      data?: Array<{ id: number; fileName: string; downloadUrl?: string; fileDate: string }>
    }
    const file = data.data?.find((f) => f.downloadUrl)
    if (!file) {
      throw new NotFoundError(`no compatible file found for project: ${projectId}`)
    }
    return {
      versionId: String(file.id),
      fileName: file.fileName,
      downloadUrl: file.downloadUrl as string,
    }
  }

  async download(installation: ModInstallation): Promise<NodeJS.ReadableStream> {
    return this.deps.http.stream(installation.downloadUrl)
  }

  private headers(): Record<string, string> {
    return {
      'x-api-key': this.deps.apiKey as string,
      Accept: 'application/json',
    }
  }

  private requireApiKey(): void {
    if (!this.deps.apiKey) {
      throw new ValidationError('CurseForge API key is not configured')
    }
  }
}
