import { Module } from '@nestjs/common'
import { DOCKER_SERVICE, type DockerService } from '../docker/docker.service'
import { DockerModule } from '../docker/docker.module'
import { DockerServerProcessManager } from './docker-server-process.manager'
import { InMemoryServersRepository } from './in-memory.servers.repository'
import {
  MINECRAFT_VERSION_PROVIDER,
  type MinecraftVersionProvider,
} from './minecraft-version.provider'
import { SERVER_PROCESS_MANAGER, type ServerProcessManager } from './server-process.manager'
import { SERVERS_REPOSITORY, type ServersRepository } from './servers.repository'
import { createServersService, SERVERS_SERVICE } from './servers.service'
import { ServersController } from './servers.controller'
import { StaticMinecraftVersionProvider } from './static-minecraft-version.provider'

@Module({
  imports: [DockerModule],
  controllers: [ServersController],
  providers: [
    {
      provide: SERVERS_REPOSITORY,
      useClass: InMemoryServersRepository,
    },
    {
      provide: MINECRAFT_VERSION_PROVIDER,
      useClass: StaticMinecraftVersionProvider,
    },
    {
      provide: SERVER_PROCESS_MANAGER,
      useFactory: (docker: DockerService) => new DockerServerProcessManager(docker),
      inject: [DOCKER_SERVICE],
    },
    {
      provide: SERVERS_SERVICE,
      useFactory: (
        repository: ServersRepository,
        versions: MinecraftVersionProvider,
        processes: ServerProcessManager,
      ) => createServersService({ repository, versions, processes }),
      inject: [SERVERS_REPOSITORY, MINECRAFT_VERSION_PROVIDER, SERVER_PROCESS_MANAGER],
    },
  ],
  exports: [SERVERS_SERVICE],
})
export class ServersModule {}
