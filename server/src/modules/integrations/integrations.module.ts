import { Module } from '@nestjs/common'
import type { ServerFileAccess } from '../files/server-file-access'
import { SERVER_FILE_ACCESS } from '../files/server-file-access'
import { FilesModule } from '../files/files.module'
import { SERVERS_SERVICE, type ServersService } from '../servers/servers.service'
import { ServersModule } from '../servers/servers.module'
import { CurseForgeProvider } from './curseforge/curseforge.provider'
import { HTTP_CLIENT, createNodeHttpClient, type HttpClient } from './http-client'
import { InMemoryInstalledModRepository } from './in-memory.installed-mod.repository'
import { INSTALLED_MOD_REPOSITORY, type InstalledModRepository } from './installed-mod'
import { IntegrationsController } from './integrations.controller'
import { createModInstallerService, MOD_INSTALLER_SERVICE } from './mod-installer.service'
import { MOD_PROVIDERS, type ModProvider, type ModProviderName } from './mod-provider'
import { ModrinthProvider } from './modrinth/modrinth.provider'
import { SERVER_TYPE_RESOLVER, type ServerTypeResolver } from './server-type.resolver'
import { ServersServerTypeResolver } from './servers.server-type.resolver'

@Module({
  imports: [ServersModule, FilesModule],
  controllers: [IntegrationsController],
  providers: [
    {
      provide: HTTP_CLIENT,
      useFactory: () => createNodeHttpClient(),
    },
    {
      provide: MOD_PROVIDERS,
      useFactory: (http: HttpClient) => ({
        modrinth: new ModrinthProvider({ http }),
        curseforge: new CurseForgeProvider({
          http,
          apiKey: process.env.CURSEFORGE_API_KEY,
        }),
      }),
      inject: [HTTP_CLIENT],
    },
    {
      provide: SERVER_TYPE_RESOLVER,
      useFactory: (servers: ServersService) => new ServersServerTypeResolver(servers),
      inject: [SERVERS_SERVICE],
    },
    {
      provide: INSTALLED_MOD_REPOSITORY,
      useClass: InMemoryInstalledModRepository,
    },
    {
      provide: MOD_INSTALLER_SERVICE,
      useFactory: (
        providers: Record<ModProviderName, ModProvider>,
        fileAccess: ServerFileAccess,
        repository: InstalledModRepository,
        serverType: ServerTypeResolver,
      ) => createModInstallerService({ providers, fileAccess, repository, serverType }),
      inject: [MOD_PROVIDERS, SERVER_FILE_ACCESS, INSTALLED_MOD_REPOSITORY, SERVER_TYPE_RESOLVER],
    },
  ],
})
export class IntegrationsModule {}
