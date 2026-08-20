import type { ProxyRoute } from './route-resolver'
import type { ProxyRouteStore } from './proxy-route.store'

export class InMemoryProxyRouteStore implements ProxyRouteStore {
  private readonly routes = new Map<string, ProxyRoute>()

  save(route: ProxyRoute): void {
    this.routes.set(route.serverId, route)
  }

  get(serverId: string): ProxyRoute | undefined {
    return this.routes.get(serverId)
  }

  all(): ProxyRoute[] {
    return [...this.routes.values()]
  }

  remove(serverId: string): void {
    this.routes.delete(serverId)
  }

  clear(): void {
    this.routes.clear()
  }
}
