import type { ProxyRoute } from './route-resolver'

export interface ProxyRouteStore {
  save(route: ProxyRoute): void
  get(serverId: string): ProxyRoute | undefined
  all(): ProxyRoute[]
  remove(serverId: string): void
  clear(): void
}

export const PROXY_ROUTE_STORE = Symbol('ProxyRouteStore')

export function slugifyHostname(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
