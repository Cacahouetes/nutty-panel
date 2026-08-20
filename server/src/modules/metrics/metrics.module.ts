import { Module } from '@nestjs/common'
import { DOCKER_SERVICE, type DockerService } from '../docker/docker.service'
import { DockerModule } from '../docker/docker.module'
import { SERVERS_SERVICE, type ServersService } from '../servers/servers.service'
import { ServersModule } from '../servers/servers.module'
import { MetricsController } from './metrics.controller'
import { createMetricsService, METRICS_SERVICE } from './metrics.service'

@Module({
  imports: [ServersModule, DockerModule],
  controllers: [MetricsController],
  providers: [
    {
      provide: METRICS_SERVICE,
      useFactory: (servers: ServersService, docker: DockerService) =>
        createMetricsService({ servers, docker }),
      inject: [SERVERS_SERVICE, DOCKER_SERVICE],
    },
  ],
})
export class MetricsModule {}
