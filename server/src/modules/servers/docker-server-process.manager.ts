import type { DockerServerInput } from '../docker/container'
import { NotFoundError, type DockerService } from '../docker/docker.service'
import type { ServerInstance } from './server-instance'
import type { ServerProcessManager } from './server-process.manager'

export class DockerServerProcessManager implements ServerProcessManager {
  constructor(private readonly docker: DockerService) {}

  async start(instance: ServerInstance): Promise<void> {
    try {
      await this.docker.getStatus(instance.id)
    } catch (err) {
      if (!(err instanceof NotFoundError)) {
        throw err
      }
      await this.docker.deploy(toDockerInput(instance))
      return
    }
    await this.docker.start(instance.id)
  }

  async stop(instance: ServerInstance): Promise<void> {
    await this.docker.stop(instance.id)
  }

  async kill(instance: ServerInstance): Promise<void> {
    await this.docker.kill(instance.id)
  }
}

function toDockerInput(instance: ServerInstance): DockerServerInput {
  return {
    id: instance.id,
    type: instance.type,
    version: instance.version,
    port: instance.port,
    memoryMb: instance.memoryMb,
    cpuPercent: instance.cpuPercent,
  }
}
