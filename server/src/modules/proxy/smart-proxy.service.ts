import type { ServersService } from '../servers/servers.service'
import type { ProxyRoute, RouteResolver } from './route-resolver'
import { createRouteResolver } from './route-resolver'
import type { ProxyRouteStore } from './proxy-route.store'
import { slugifyHostname } from './proxy-route.store'
import type { ServerStatusProbe } from './server-status-probe'
import type { SmartProxy } from './smart-proxy'

export interface ProxyRouteStatus extends ProxyRoute {
  online: boolean
}

export interface SmartProxyStatus {
  publicPort: number
  listening: boolean
  routes: ProxyRouteStatus[]
}

export interface SmartProxyService {
  start(): Promise<void>
  stop(): Promise<void>
  refresh(): Promise<void>
  getStatus(): Promise<SmartProxyStatus>
  getRoutes(): Promise<ProxyRouteStatus[]>
}

export const PROXY_SERVICE = Symbol('ProxyService')

export interface ProxyServiceConfig {
  publicPort: number
  proxyDomain: string
  defaultServerId?: string
  host?: string
}

export interface SmartProxyServiceDeps {
  store: ProxyRouteStore
  servers: Pick<ServersService, 'findAll'>
  probe: ServerStatusProbe
  proxy: SmartProxy
  config: ProxyServiceConfig
}

export function createSmartProxyService(deps: SmartProxyServiceDeps): SmartProxyService {
  return new DefaultSmartProxyService(deps)
}

class DefaultSmartProxyService implements SmartProxyService {
  constructor(private readonly deps: SmartProxyServiceDeps) {}

  async start(): Promise<void> {
    await this.rebuildRoutes()
    await this.deps.proxy.start({
      resolver: this.buildResolver(),
      port: this.deps.config.publicPort,
      host: this.deps.config.host,
    })
  }

  async stop(): Promise<void> {
    await this.deps.proxy.stop()
  }

  async refresh(): Promise<void> {
    await this.stop()
    await this.start()
  }

  async getStatus(): Promise<SmartProxyStatus> {
    return {
      publicPort: this.deps.config.publicPort,
      listening: this.deps.proxy.isListening(),
      routes: await this.getRoutes(),
    }
  }

  async getRoutes(): Promise<ProxyRouteStatus[]> {
    const routes = this.deps.store.all()
    return Promise.all(
      routes.map(async (route) => ({
        ...route,
        online: await this.deps.probe.probe(route.targetHost, route.targetPort),
      })),
    )
  }

  private buildResolver(): RouteResolver {
    return createRouteResolver(this.deps.store.all())
  }

  private async rebuildRoutes(): Promise<void> {
    this.deps.store.clear()
    const servers = await this.deps.servers.findAll()
    for (const server of servers) {
      this.deps.store.save({
        serverId: server.id,
        name: server.name,
        targetHost: '127.0.0.1',
        targetPort: server.port,
        hostnames: [`${slugifyHostname(server.name)}.${this.deps.config.proxyDomain}`],
        isDefault: server.id === this.deps.config.defaultServerId,
      })
    }
  }
}
