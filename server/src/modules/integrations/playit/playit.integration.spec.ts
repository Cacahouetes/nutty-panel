import { describe, it, expect, afterEach } from '@jest/globals'
import { createServer, Server } from 'node:http'
import { AddressInfo } from 'node:net'
import { HttpPlayitApi, PlayitAuthError, PlayitNotFoundError } from './playit-api'
import { createPlayitService } from './playit.service'
import { InMemoryPlayitTunnelStore } from './in-memory-playit-tunnel-store'
import type { ServerInstance } from '../../servers/server-instance'

const servers: Server[] = []

afterEach(async () => {
  for (const server of servers) {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  servers.length = 0
})

async function startPlayitServer(): Promise<string> {
  const server = createServer((req, res) => {
    let raw = ''
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString()
    })
    req.on('end', () => {
      const auth = req.headers.authorization
      if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'unauthorized' }))
        return
      }
      if (req.url === '/tunnels/create') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            data: {
              tunnel: { id: 'tunnel-1' },
              allocation: { ip: 'alpha.playit.gg', port: 25565 },
            },
          }),
        )
        return
      }
      if (req.url === '/tunnels/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            data: {
              tunnels: [
                {
                  tunnel_id: 'tunnel-1',
                  allocation: { ip: 'alpha.playit.gg', port: 25565 },
                },
              ],
            },
          }),
        )
        return
      }
      if (req.url === '/tunnels/delete') {
        const body = JSON.parse(raw) as { tunnel_id?: string }
        if (body.tunnel_id === 'tunnel-1') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ data: { ok: true } }))
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'not found' }))
        }
        return
      }
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'not found' }))
    })
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const { port } = server.address() as AddressInfo
  return `http://127.0.0.1:${port}`
}

describe('Playit integration (local Playit API)', () => {
  it('creates, lists and deletes a tunnel end-to-end', async () => {
    const baseUrl = await startPlayitServer()
    const api = new HttpPlayitApi({ baseUrl, apiKey: 'test-key' })

    const created = await api.createTunnel({
      name: 'Survival',
      portType: 'tcp',
      localAddress: '127.0.0.1:25565',
    })
    expect(created).toEqual({ tunnelId: 'tunnel-1', host: 'alpha.playit.gg', port: 25565 })

    const tunnels = await api.listTunnels()
    expect(tunnels).toEqual([{ tunnelId: 'tunnel-1', host: 'alpha.playit.gg', port: 25565 }])

    await api.deleteTunnel('tunnel-1')
    await expect(api.deleteTunnel('missing')).resolves.toBeUndefined()
  })

  it('drives the whole flow through the service', async () => {
    const baseUrl = await startPlayitServer()
    const api = new HttpPlayitApi({ baseUrl, apiKey: 'test-key' })
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
    const service = createPlayitService({
      api,
      runner: {
        start: async () => undefined,
        stop: async () => undefined,
        status: () => 'running',
      },
      store: new InMemoryPlayitTunnelStore(),
      servers: { findOne: async () => server },
    })

    const tunnel = await service.ensureTunnel('server-1')
    expect(tunnel).toMatchObject({ serverId: 'server-1', host: 'alpha.playit.gg', port: 25565 })

    expect(service.listTunnels()).toHaveLength(1)
    expect((await service.getStatus()).tunnels).toBe(1)

    await service.removeTunnel('server-1')
    expect(service.listTunnels()).toHaveLength(0)
  })

  it('rejects an invalid key with PlayitAuthError', async () => {
    const baseUrl = await startPlayitServer()
    const api = new HttpPlayitApi({ baseUrl })

    await expect(api.listTunnels()).rejects.toBeInstanceOf(PlayitAuthError)
    await expect(api.listTunnels()).rejects.toMatchObject({
      name: 'PlayitAuthError',
    })
  })

  it('deleting an unknown tunnel id maps to success (idempotent)', async () => {
    const baseUrl = await startPlayitServer()
    const api = new HttpPlayitApi({ baseUrl, apiKey: 'test-key' })

    await expect(api.deleteTunnel('nope')).resolves.toBeUndefined()
  })

  it('fails to find an unknown endpoint with PlayitNotFoundError', async () => {
    const baseUrl = await startPlayitServer()
    const fakeFetch = async () =>
      new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    const strictApi = new HttpPlayitApi({
      baseUrl,
      apiKey: 'test-key',
      fetchImpl: fakeFetch,
    })

    await expect(strictApi.listTunnels()).rejects.toBeInstanceOf(PlayitNotFoundError)
  })
})
