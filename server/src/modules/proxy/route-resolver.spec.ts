import { describe, it, expect } from '@jest/globals'
import { NoRouteForHostError, createRouteResolver, type ProxyRoute } from './route-resolver'

const routes: ProxyRoute[] = [
  {
    serverId: 'lobby',
    name: 'Lobby',
    targetHost: '127.0.0.1',
    targetPort: 25566,
    hostnames: ['lobby.play.example.com'],
  },
  {
    serverId: 'survival',
    name: 'Survival',
    targetHost: '127.0.0.1',
    targetPort: 25567,
    hostnames: ['survival.play.example.com'],
    isDefault: true,
  },
]

function build(overrides: { routes?: ProxyRoute[] } = {}) {
  return createRouteResolver(overrides.routes ?? routes)
}

describe('createRouteResolver', () => {
  it('routes by exact hostname match', () => {
    const resolver = build()

    const target = resolver.resolve('lobby.play.example.com', 25565)

    expect(target).toEqual({ host: '127.0.0.1', port: 25566 })
  })

  it('routes by hostname ignoring case and a trailing dot', () => {
    const resolver = build()

    const target = resolver.resolve('SURVIVAL.play.example.com.', 25565)

    expect(target).toEqual({ host: '127.0.0.1', port: 25567 })
  })

  it('routes a subdomain of a configured hostname', () => {
    const resolver = build()

    const target = resolver.resolve('eu.lobby.play.example.com', 25565)

    expect(target.port).toBe(25566)
  })

  it('routes by the requested port when the hostname matches nothing', () => {
    const resolver = build()

    const target = resolver.resolve('unknown.example.com', 25567)

    expect(target).toEqual({ host: '127.0.0.1', port: 25567 })
  })

  it('falls back to the default route for unknown hosts', () => {
    const resolver = build()

    const target = resolver.resolve('unknown.example.com', 9999)

    expect(target).toEqual({ host: '127.0.0.1', port: 25567 })
  })

  it('throws NoRouteForHostError when no route and no default exists', () => {
    const resolver = build({ routes: [routes[0]] })

    expect(() => resolver.resolve('unknown.example.com', 9999)).toThrow(NoRouteForHostError)
  })

  it('prefers a hostname match over a port match', () => {
    const resolver = build()
    const hostnameRoute = resolver.resolve('survival.play.example.com', 25566)

    expect(hostnameRoute.port).toBe(25567)
  })

  it('rejects an empty hostname', () => {
    const resolver = build()

    expect(() => resolver.resolve('', 25565)).toThrow(NoRouteForHostError)
  })
})
