import { NotFoundError } from '../integrations.errors'
import type { HttpClient } from '../http-client'
import type {
  ModInstallation,
  ModProject,
  ModProvider,
  ModSearchOptions,
  ModSearchResult,
} from '../mod-provider'

const BASE_URL = 'https://api.modrinth.com/v2'

export interface ModrinthProviderDeps {
  http: HttpClient
  baseUrl?: string
}

export class ModrinthProvider implements ModProvider {
  readonly name = 'modrinth' as const
  private readonly baseUrl: string

  constructor(private readonly deps: ModrinthProviderDeps) {
    this.baseUrl = deps.baseUrl ?? BASE_URL
  }

  async search(query: string, opts: ModSearchOptions = {}): Promise<ModSearchResult[]> {
    const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}${facetsParam(opts)}`
    const data = (await this.deps.http.getJson(url)) as {
      hits?: Array<{
        project_id: string
        title: string
        description?: string
        project_type: string
        downloads: number
      }>
    }
    return (data.hits ?? []).map((hit) => ({
      projectId: hit.project_id,
      provider: 'modrinth',
      name: hit.title,
      description: hit.description,
      type: hit.project_type,
      downloads: hit.downloads,
    }))
  }

  async getProject(projectId: string): Promise<ModProject> {
    const data = (await this.deps.http.getJson(`${this.baseUrl}/project/${projectId}`)) as {
      title: string
      description?: string
    }
    return { projectId, name: data.title, description: data.description }
  }

  async getInstallation(projectId: string, opts: ModSearchOptions = {}): Promise<ModInstallation> {
    const url = `${this.baseUrl}/project/${projectId}/version${versionsParam(opts)}`
    const versions = (await this.deps.http.getJson(url)) as Array<{
      id: string
      files?: Array<{ url: string; filename: string }>
    }>
    const version = versions[0]
    const file = version?.files?.[0]
    if (!version || !file) {
      throw new NotFoundError(`no compatible version found for project: ${projectId}`)
    }
    return {
      versionId: version.id,
      fileName: file.filename,
      downloadUrl: file.url,
    }
  }

  async download(installation: ModInstallation): Promise<NodeJS.ReadableStream> {
    return this.deps.http.stream(installation.downloadUrl)
  }
}

function facetsParam(opts: ModSearchOptions): string {
  const facets: string[][] = []
  if (opts.type) facets.push([`project_type:${opts.type}`])
  if (opts.loader) facets.push([`categories:${opts.loader}`])
  if (opts.gameVersion) facets.push([`versions:${opts.gameVersion}`])
  return facets.length > 0 ? `&facets=${encodeURIComponent(JSON.stringify(facets))}` : ''
}

function versionsParam(opts: ModSearchOptions): string {
  const params: string[] = []
  if (opts.gameVersion) {
    params.push(`game_versions=${encodeURIComponent(JSON.stringify([opts.gameVersion]))}`)
  }
  if (opts.loader) {
    params.push(`loaders=${encodeURIComponent(JSON.stringify([opts.loader]))}`)
  }
  return params.length > 0 ? `?${params.join('&')}` : ''
}
