import { randomUUID } from 'node:crypto'
import type { ServerFileAccess } from '../files/server-file-access'
import type { InstalledMod } from './installed-mod'
import type { InstalledModRepository } from './installed-mod'
import { NotFoundError, ValidationError } from './integrations.errors'
import type {
  ModProvider,
  ModProviderName,
  ModSearchOptions,
  ModSearchResult,
} from './mod-provider'
import type { ServerTypeResolver } from './server-type.resolver'
import { resolveTargetDirectory } from './target-dir'

export interface ModInstallerService {
  search(
    providerName: ModProviderName,
    query: string,
    opts?: ModSearchOptions,
  ): Promise<ModSearchResult[]>
  install(
    serverId: string,
    providerName: ModProviderName,
    projectId: string,
    opts?: ModSearchOptions,
  ): Promise<InstalledMod>
  listInstalled(serverId: string): Promise<InstalledMod[]>
  uninstall(id: string): Promise<void>
}

export const MOD_INSTALLER_SERVICE = Symbol('ModInstallerService')

export interface ModInstallerServiceDeps {
  providers: Record<ModProviderName, ModProvider>
  fileAccess: ServerFileAccess
  repository: InstalledModRepository
  serverType: ServerTypeResolver
}

export function createModInstallerService(deps: ModInstallerServiceDeps): ModInstallerService {
  return new DefaultModInstallerService(deps)
}

class DefaultModInstallerService implements ModInstallerService {
  constructor(private readonly deps: ModInstallerServiceDeps) {}

  async search(
    providerName: ModProviderName,
    query: string,
    opts: ModSearchOptions = {},
  ): Promise<ModSearchResult[]> {
    return this.provider(providerName).search(query, opts)
  }

  async install(
    serverId: string,
    providerName: ModProviderName,
    projectId: string,
    opts: ModSearchOptions = {},
  ): Promise<InstalledMod> {
    const provider = this.provider(providerName)
    const serverType = await this.deps.serverType.getServerType(serverId)
    const [installation, project] = await Promise.all([
      provider.getInstallation(projectId, opts),
      provider.getProject(projectId),
    ])
    const targetPath = `${resolveTargetDirectory(serverType, opts.type)}/${safeFileName(
      installation.fileName,
    )}`
    const stream = await provider.download(installation)
    await this.deps.fileAccess.upload(serverId, targetPath, stream)
    return this.deps.repository.save({
      id: randomUUID(),
      serverId,
      provider: providerName,
      projectId,
      projectName: project.name,
      versionId: installation.versionId,
      fileName: installation.fileName,
      targetPath,
      installedAt: new Date(),
    })
  }

  async listInstalled(serverId: string): Promise<InstalledMod[]> {
    return this.deps.repository.listByServer(serverId)
  }

  async uninstall(id: string): Promise<void> {
    const existing = await this.deps.repository.find(id)
    if (!existing) {
      throw new NotFoundError(`installed mod not found: ${id}`)
    }
    await this.deps.repository.delete(id)
  }

  private provider(providerName: ModProviderName): ModProvider {
    const provider = this.deps.providers[providerName]
    if (!provider) {
      throw new ValidationError(`unsupported provider: ${providerName}`)
    }
    return provider
  }
}

function safeFileName(fileName: string): string {
  const base = fileName.replace(/[\\/]/g, '')
  if (!base || base === '.' || base === '..' || base.includes('..')) {
    throw new ValidationError(`unsafe file name: ${fileName}`)
  }
  return base
}
