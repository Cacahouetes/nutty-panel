import { describe, it, expect } from '@jest/globals'
import { createPlayitService, PlayitServerNotFoundError } from './playit.service'
import { InMemoryPlayitTunnelStore } from './in-memory-playit-tunnel-store'
import { NotFoundError as ServersNotFoundError } from '../../servers/servers.service'
import type { ServerInstance } from '../../servers/server-instance'

function build(overrides: Partial<Parameters<typeof createPlayitService>[0]> = {}) {
  const createTunnel = jest.fn(async () => ({
    tunnelId: 'tunnel-1',
    host: '123.playit.gg',
    port: 25565,
  }))
  const listTunnels = jest.fn(async () => [])
  const deleteTunnel = jest.fn(async () => undefined)
  const status = jest.fn(() => 'running' as const)
  const api = { createTunnel, listTunnels, deleteTunnel }
  const runner = {
    start: jest.fn(async () => undefined),
    stop: jest.fn(async () => undefined),
    status,
  }
  const server: ServerInstance = {
    id: 'server-1',
    name: 'Survival',
    type: 'paper',
    version: '1.21.1',
    port: 25565,
    memoryMb: 2048,
    cpuPercent: 100,
    status: 'stopped',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const findOne = jest.fn(async (id: string) => (id === server.id ? server : undefined))
  const store = new InMemoryPlayitTunnelStore()
  const service = createPlayitService({
    api,
    runner,
    servers: { findOne } as Parameters<typeof createPlayitService>[0]['servers'],
    store,
    ...overrides,
  })
  return { service, api, runner, servers: { findOne }, server, store, createTunnel, deleteTunnel }
}

describe('PlayitService', () => {
  it('creates a tunnel for a server on first ensure', async () => {
    const { service, createTunnel, store } = build()

    const tunnel = await service.ensureTunnel('server-1')

    expect((createTunnel as jest.Mock).mock.calls[0]).toEqual([
      { name: 'Survival', portType: 'tcp', localAddress: '127.0.0.1:25565' },
    ])
    expect(tunnel).toMatchObject({
      serverId: 'server-1',
      serverName: 'Survival',
      tunnelId: 'tunnel-1',
      host: '123.playit.gg',
      port: 25565,
    })
    expect(store.get('server-1')).toEqual(tunnel)
  })

  it('reuses an existing tunnel on subsequent ensures', async () => {
    const { service, createTunnel } = build()

    const first = await service.ensureTunnel('server-1')
    const second = await service.ensureTunnel('server-1')

    expect(second).toBe(first)
    expect(createTunnel).toHaveBeenCalledTimes(1)
  })

  it('throws PlayitServerNotFoundError for an unknown server', async () => {
    const { service, servers } = build()
    servers.findOne.mockRejectedValueOnce(new ServersNotFoundError('server not found: missing'))

    await expect(service.ensureTunnel('missing')).rejects.toBeInstanceOf(PlayitServerNotFoundError)
  })

  it('lists tunnels from the store', async () => {
    const { service } = build()
    await service.ensureTunnel('server-1')

    expect(service.listTunnels()).toHaveLength(1)
  })

  it('gets a tunnel for a server', async () => {
    const { service } = build()
    const tunnel = await service.ensureTunnel('server-1')

    await expect(service.getTunnel('server-1')).resolves.toEqual(tunnel)
  })

  it('throws when getting an unconfigured tunnel', async () => {
    const { service } = build()

    await expect(service.getTunnel('server-1')).rejects.toBeInstanceOf(PlayitServerNotFoundError)
  })

  it('removes a tunnel and its store record', async () => {
    const { service, deleteTunnel, store } = build()
    await service.ensureTunnel('server-1')

    await service.removeTunnel('server-1')

    expect((deleteTunnel as jest.Mock).mock.calls[0]).toEqual(['tunnel-1'])
    expect(store.get('server-1')).toBeUndefined()
  })

  it('purges store records for tunnels that no longer exist', async () => {
    const { service, store, deleteTunnel } = build()
    await service.ensureTunnel('server-1')

    await service.removeTunnel('server-1')
    await service.removeTunnel('server-1')

    expect(deleteTunnel).toHaveBeenCalledTimes(1)
    expect(store.all()).toHaveLength(0)
  })

  it('reports agent status and tunnel count', async () => {
    const { service, runner } = build()
    await service.ensureTunnel('server-1')

    const reported = await service.getStatus()

    expect(reported).toEqual({ agent: 'running', tunnels: 1 })
    expect(runner.status).toHaveBeenCalled()
  })
})
