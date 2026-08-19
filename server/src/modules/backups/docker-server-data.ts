import type { DockerService } from '../docker/docker.service'
import type { ServerDataAccess } from './server-data'

export class DockerServerDataAccess implements ServerDataAccess {
  constructor(private readonly docker: DockerService) {}

  async exportData(serverId: string): Promise<NodeJS.ReadableStream> {
    return this.docker.exportData(serverId)
  }

  async importData(serverId: string, stream: NodeJS.ReadableStream): Promise<void> {
    await this.docker.importData(serverId, stream)
  }
}
