export interface ProxyRoute {
  serverId: string
  name: string
  targetHost: string
  targetPort: number
  hostnames: string[]
  isDefault?: boolean
}

export interface ProxyRouteTarget {
  host: string
  port: number
}

export interface RouteResolver {
  resolve(requestedHost: string, requestedPort: number): ProxyRouteTarget
}

export class NoRouteForHostError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NoRouteForHostError'
  }
}

function normalizeHost(host: string): string {
  return host.replace(/\.+$/, '').toLowerCase()
}

function hostMatches(route: ProxyRoute, requestedHost: string): boolean {
  return route.hostnames.some((hostname) => {
    const normalized = normalizeHost(hostname)
    return requestedHost === normalized || requestedHost.endsWith(`.${normalized}`)
  })
}

export function createRouteResolver(routes: ProxyRoute[]): RouteResolver {
  return {
    resolve(requestedHost: string, requestedPort: number): ProxyRouteTarget {
      const normalizedHost = normalizeHost(requestedHost)
      if (normalizedHost.length === 0) {
        throw new NoRouteForHostError('empty requested host')
      }
      const hostnameMatch = routes.find((route) => hostMatches(route, normalizedHost))
      if (hostnameMatch) {
        return { host: hostnameMatch.targetHost, port: hostnameMatch.targetPort }
      }
      const portMatch = routes.find((route) => route.targetPort === requestedPort)
      if (portMatch) {
        return { host: portMatch.targetHost, port: portMatch.targetPort }
      }
      const defaultRoute = routes.find((route) => route.isDefault)
      if (defaultRoute) {
        return { host: defaultRoute.targetHost, port: defaultRoute.targetPort }
      }
      throw new NoRouteForHostError(`no proxy route for ${requestedHost}:${requestedPort}`)
    },
  }
}
