import { describe, it, expect } from '@jest/globals'
import { createSmartProxyService } from './smart-proxy.service'
import { InMemoryProxyRouteStore } from './in-memory.proxy-route.store'
import type { ServerStatusProbe } from './server-status-probe'
import type { SmartProxy } from './smart-proxy'
import type { RouteResolver } from './route-resolver'
import type { ServerInstance } from '../servers/server-instance'

type StartOptions = { resolver: RouteResolver; port: number; host?: string }

function makeServer(id: string, name: string, port: number): ServerInstance {
  return {
    id,
    name,
    type: 'paper',
    version: '1.21.1',
    port,
    memoryMb: 2048,
    cpuPercent: 100,
    status: 'stopped',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function build(overrides: Partial<Parameters<typeof createSmartProxyService>[0]> = {}) {
  const servers = [
    makeServer('lobby', 'Lobby', 25566),
    makeServer('survival', 'Survival Deux', 25567),
  ]
  const probeMock = jest.fn<Promise<boolean>, [host: string, port: number]>()
  const startMock = jest.fn<Promise<void>, [options: StartOptions]>()
  const stopMock = jest.fn<Promise<void>, []>()
  const probe: ServerStatusProbe = { probe: probeMock }
  const proxy: SmartProxy = { start: startMock, stop: stopMock, isListening: jest.fn(() => true) }
  const store = new InMemoryProxyRouteStore()
  const service = createSmartProxyService({
    store,
    servers: { findAll: jest.fn(async () => servers) },
    probe,
    proxy,
    config: { publicPort: 25565, proxyDomain: 'play.example.com', defaultServerId: 'survival' },
    ...overrides,
  })
  return { service, servers, probeMock, startMock, stopMock, store }
}

describe('createSmartProxyService', () => {
  it('builds routes from servers and starts the proxy', async () => {
    const { service, startMock, store } = build()

    await service.start()

    expect(store.all()).toHaveLength(2)
    expect(store.get('lobby')).toMatchObject({
      serverId: 'lobby',
      targetHost: '127.0.0.1',
      targetPort: 25566,
      hostnames: ['lobby.play.example.com'],
    })
    expect(store.get('survival')).toMatchObject({
      hostnames: ['survival-deux.play.example.com'],
      isDefault: true,
    })
    expect(startMock).toHaveBeenCalledWith({
      resolver: expect.any(Object),
      port: 25565,
    })
  })

  it('reports the public port and listening state', async () => {
    const { service } = build()
    await service.start()

    const status = await service.getStatus()

    expect(status.publicPort).toBe(25565)
    expect(status.listening).toBe(true)
    expect(status.routes).toHaveLength(2)
  })

  it('reports online status per route via the probe', async () => {
    const { service, probeMock } = build()
    await service.start()
    probeMock.mockImplementation(
      async (host: string, port: number) => port === 25566 && host.length > 0,
    )

    const routes = await service.getRoutes()

    expect(routes.find((r) => r.serverId === 'lobby')?.online).toBe(true)
    expect(routes.find((r) => r.serverId === 'survival')?.online).toBe(false)
    expect(probeMock).toHaveBeenCalledTimes(2)
  })

  it('restarts the proxy on refresh', async () => {
    const { service, startMock, stopMock } = build()
    await service.start()

    await service.refresh()

    expect(stopMock).toHaveBeenCalled()
    expect(startMock).toHaveBeenCalledTimes(2)
  })

  it('stops the proxy', async () => {
    const { service, stopMock } = build()
    await service.start()

    await service.stop()

    expect(stopMock).toHaveBeenCalled()
  })

  it('leaves no default route when none is configured', async () => {
    const { service, store } = build({
      config: { publicPort: 25565, proxyDomain: 'play.example.com' },
    })

    await service.start()

    expect(store.all().every((r) => !r.isDefault)).toBe(true)
  })
})
