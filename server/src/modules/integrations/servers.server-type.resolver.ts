import { NotFoundError } from './integrations.errors'
import type { ServerTypeResolver } from './server-type.resolver'
import {
  NotFoundError as ServersNotFoundError,
  type ServersService,
} from '../servers/servers.service'

export class ServersServerTypeResolver implements ServerTypeResolver {
  constructor(private readonly servers: ServersService) {}

  async getServerType(serverId: string) {
    try {
      const server = await this.servers.findOne(serverId)
      return server.type
    } catch (err) {
      if (err instanceof ServersNotFoundError) {
        throw new NotFoundError(`server not found: ${serverId}`)
      }
      throw err
    }
  }
}
