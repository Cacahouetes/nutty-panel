import { describe, it, expect, beforeEach } from '@jest/globals'
import { Readable } from 'node:stream'
import type { ServerFileAccess } from '../files/server-file-access'
import type { InstalledModRepository } from './installed-mod'
import { InMemoryInstalledModRepository } from './in-memory.installed-mod.repository'
import { NotFoundError, ValidationError } from './integrations.errors'
import type {
  ModInstallation,
  ModProject,
  ModProvider,
  ModProviderName,
  ModSearchOptions,
  ModSearchResult,
} from './mod-provider'
import {
  createModInstallerService,
  type ModInstallerService,
  type ModInstallerServiceDeps,
} from './mod-installer.service'
import type { ServerType } from '../servers/server-instance'
import type { ServerTypeResolver } from './server-type.resolver'

class RecordingProvider implements ModProvider {
  readonly name: ModProviderName
  searchCalls: Array<{ query: string; opts: ModSearchOptions }> = []
  installation: ModInstallation = {
    versionId: 'v1',
    fileName: 'sodium.jar',
    downloadUrl: 'https://cdn/sodium.jar',
  }
  project: ModProject = { projectId: 'A1', name: 'Sodium' }

  constructor(name: ModProviderName) {
    this.name = name
  }

  async search(query: string, opts: ModSearchOptions = {}): Promise<ModSearchResult[]> {
    this.searchCalls.push({ query, opts })
    return [
      {
        projectId: 'A1',
        provider: this.name,
        name: 'Sodium',
        type: 'mod',
      },
    ]
  }

  async getProject(projectId: string): Promise<ModProject> {
    return { ...this.project, projectId }
  }

  async getInstallation(): Promise<ModInstallation> {
    return this.installation
  }

  async download(): Promise<NodeJS.ReadableStream> {
    return Readable.from(['mod-jar-content'])
  }
}

class FakeServerFileAccess implements ServerFileAccess {
  uploads: Array<{ serverId: string; path: string; content: string }> = []

  async upload(serverId: string, path: string, stream: NodeJS.ReadableStream): Promise<void> {
    const chunks: Buffer[] = []
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk))
    }
    this.uploads.push({ serverId, path, content: Buffer.concat(chunks).toString() })
  }

  list(): never {
    throw new Error('not implemented')
  }
  readText(): never {
    throw new Error('not implemented')
  }
  writeText(): never {
    throw new Error('not implemented')
  }
  createDirectory(): never {
    throw new Error('not implemented')
  }
  remove(): never {
    throw new Error('not implemented')
  }
  rename(): never {
    throw new Error('not implemented')
  }
  download(): never {
    throw new Error('not implemented')
  }
}

class FixedServerTypeResolver implements ServerTypeResolver {
  type: ServerType = 'fabric'

  async getServerType(): Promise<ServerType> {
    return this.type
  }
}

describe('ModInstallerService', () => {
  let modrinth: RecordingProvider
  let curseforge: RecordingProvider
  let fileAccess: FakeServerFileAccess
  let repository: InstalledModRepository
  let serverType: FixedServerTypeResolver
  let service: ModInstallerService

  function build() {
    const deps: ModInstallerServiceDeps = {
      providers: {
        modrinth,
        curseforge,
      },
      fileAccess,
      repository,
      serverType,
    }
    service = createModInstallerService(deps)
  }

  beforeEach(() => {
    modrinth = new RecordingProvider('modrinth')
    curseforge = new RecordingProvider('curseforge')
    fileAccess = new FakeServerFileAccess()
    repository = new InMemoryInstalledModRepository()
    serverType = new FixedServerTypeResolver()
    build()
  })

  it('searches with the selected provider and options', async () => {
    const results = await service.search('modrinth', 'sodium', {
      type: 'mod',
      loader: 'fabric',
      gameVersion: '1.20.4',
    })

    expect(results).toHaveLength(1)
    expect(modrinth.searchCalls).toEqual([
      { query: 'sodium', opts: { type: 'mod', loader: 'fabric', gameVersion: '1.20.4' } },
    ])
    expect(curseforge.searchCalls).toEqual([])
  })

  it('rejects an unknown provider', async () => {
    await expect(service.search('unknown' as ModProviderName, 'x')).rejects.toBeInstanceOf(
      ValidationError,
    )
    await expect(service.install('srv', 'unknown' as ModProviderName, 'A1')).rejects.toBeInstanceOf(
      ValidationError,
    )
  })

  it('installs a mod into the mods directory of a fabric server', async () => {
    serverType.type = 'fabric'

    const mod = await service.install('srv-1', 'modrinth', 'A1', { type: 'mod' })

    expect(mod).toMatchObject({
      serverId: 'srv-1',
      provider: 'modrinth',
      projectId: 'A1',
      projectName: 'Sodium',
      versionId: 'v1',
      fileName: 'sodium.jar',
      targetPath: 'mods/sodium.jar',
    })
    expect(fileAccess.uploads).toEqual([
      { serverId: 'srv-1', path: 'mods/sodium.jar', content: 'mod-jar-content' },
    ])
  })

  it('installs a plugin into the plugins directory of a paper server', async () => {
    serverType.type = 'paper'

    await service.install('srv-2', 'curseforge', 'B2', { type: 'plugin' })

    expect(fileAccess.uploads).toEqual([
      { serverId: 'srv-2', path: 'plugins/sodium.jar', content: 'mod-jar-content' },
    ])
  })

  it('propagates NotFoundError when the server does not exist', async () => {
    serverType.getServerType = async () => {
      throw new NotFoundError('server not found: nope')
    }

    await expect(service.install('nope', 'modrinth', 'A1')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects file names with path separators', async () => {
    modrinth.installation = {
      versionId: 'v1',
      fileName: '../../evil.jar',
      downloadUrl: 'https://cdn/evil.jar',
    }

    await expect(service.install('srv-1', 'modrinth', 'A1')).rejects.toBeInstanceOf(ValidationError)
    expect(fileAccess.uploads).toEqual([])
  })

  it('lists and uninstalls installed mods', async () => {
    const mod = await service.install('srv-1', 'modrinth', 'A1')
    await service.install('srv-2', 'curseforge', 'B2')

    expect(await service.listInstalled('srv-1')).toEqual([mod])
    expect(await service.listInstalled('srv-2')).toHaveLength(1)

    await service.uninstall(mod.id)

    expect(await service.listInstalled('srv-1')).toEqual([])
  })

  it('rejects uninstalling an unknown record', async () => {
    await expect(service.uninstall('missing')).rejects.toBeInstanceOf(NotFoundError)
  })
})
