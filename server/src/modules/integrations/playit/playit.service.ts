import { NotFoundError as ServersNotFoundError } from '../../servers/servers.service'
import type { ServersService } from '../../servers/servers.service'
import type { PlayitApi } from './playit-api'
import type { PlayitAgentRunner, PlayitAgentStatus } from './playit-agent-runner'
import { PlayitTunnel, PlayitTunnelStore } from './playit-tunnel-store'

export class PlayitServerNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlayitServerNotFoundError'
  }
}

export interface PlayitStatus {
  agent: PlayitAgentStatus
  tunnels: number
}

export interface PlayitService {
  ensureTunnel(serverId: string): Promise<PlayitTunnel>
  getTunnel(serverId: string): Promise<PlayitTunnel>
  listTunnels(): PlayitTunnel[]
  removeTunnel(serverId: string): Promise<void>
  getStatus(): Promise<PlayitStatus>
}

export const PLAYIT_SERVICE = Symbol('PlayitService')

export interface PlayitServiceDeps {
  api: PlayitApi
  runner: PlayitAgentRunner
  store: PlayitTunnelStore
  servers: Pick<ServersService, 'findOne'>
}

export function createPlayitService(deps: PlayitServiceDeps): PlayitService {
  return new DefaultPlayitService(deps)
}

class DefaultPlayitService implements PlayitService {
  constructor(private readonly deps: PlayitServiceDeps) {}

  async ensureTunnel(serverId: string): Promise<PlayitTunnel> {
    const existing = this.deps.store.get(serverId)
    if (existing) {
      return existing
    }
    const server = await this.mustFindServer(serverId)
    const ref = await this.deps.api.createTunnel({
      name: server.name,
      portType: 'tcp',
      localAddress: `127.0.0.1:${server.port}`,
    })
    const tunnel: PlayitTunnel = {
      serverId,
      serverName: server.name,
      tunnelId: ref.tunnelId,
      host: ref.host,
      port: ref.port,
      createdAt: new Date(),
    }
    this.deps.store.save(tunnel)
    return tunnel
  }

  async getTunnel(serverId: string): Promise<PlayitTunnel> {
    const tunnel = this.deps.store.get(serverId)
    if (!tunnel) {
      throw new PlayitServerNotFoundError(`no tunnel configured for server: ${serverId}`)
    }
    return tunnel
  }

  listTunnels(): PlayitTunnel[] {
    return this.deps.store.all()
  }

  async removeTunnel(serverId: string): Promise<void> {
    const record = this.deps.store.get(serverId)
    this.deps.store.remove(serverId)
    if (record) {
      await this.deps.api.deleteTunnel(record.tunnelId)
    }
  }

  async getStatus(): Promise<PlayitStatus> {
    return {
      agent: this.deps.runner.status(),
      tunnels: this.deps.store.all().length,
    }
  }

  private async mustFindServer(serverId: string) {
    try {
      const server = await this.deps.servers.findOne(serverId)
      if (!server) {
        throw new ServersNotFoundError(`server not found: ${serverId}`)
      }
      return server
    } catch (err) {
      if (err instanceof ServersNotFoundError) {
        throw new PlayitServerNotFoundError(`server not found: ${serverId}`)
      }
      throw err
    }
  }
}
