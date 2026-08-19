import { Module } from '@nestjs/common'
import { CONTAINER_MANAGER } from './container.manager'
import { DockerContainerManager } from './docker.container.manager'
import { DOCKER_SERVICE, createDockerService } from './docker.service'
import type { ContainerManager } from './container.manager'

@Module({
  providers: [
    { provide: CONTAINER_MANAGER, useClass: DockerContainerManager },
    {
      provide: DOCKER_SERVICE,
      useFactory: (containerManager: ContainerManager) => createDockerService({ containerManager }),
      inject: [CONTAINER_MANAGER],
    },
  ],
  exports: [DOCKER_SERVICE, CONTAINER_MANAGER],
})
export class DockerModule {}
