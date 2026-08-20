import { describe, it, expect } from '@jest/globals'
import {
  HttpPlayitApi,
  PlayitAuthError,
  PlayitNotFoundError,
  PlayitRateLimitError,
  PlayitApiError,
} from './playit-api'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function build(fetchImpl: typeof fetch) {
  return new HttpPlayitApi({
    baseUrl: 'https://api.playit.gg',
    apiKey: 'test-key',
    fetchImpl,
  })
}

describe('HttpPlayitApi', () => {
  it('creates a tcp tunnel and parses tunnel id and allocation', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        data: {
          tunnel: { id: 'tunnel-1' },
          allocation: { ip: '123.playit.gg', port: 25565 },
        },
      }),
    )
    const api = build(fetchImpl)

    const tunnel = await api.createTunnel({
      name: 'Survival',
      portType: 'tcp',
      localAddress: '127.0.0.1:25565',
    })

    expect(tunnel).toEqual({ tunnelId: 'tunnel-1', host: '123.playit.gg', port: 25565 })
    const [url, init] = (fetchImpl as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.playit.gg/tunnels/create')
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Survival',
      port_type: 'tcp',
      local_address: '127.0.0.1:25565',
    })
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-key' })
  })

  it('lists tunnels and their connection addresses', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({
        data: {
          tunnels: [
            {
              tunnel_id: 'tunnel-1',
              allocation: { ip: '123.playit.gg', port: 25565 },
            },
            {
              tunnel: { id: 'tunnel-2' },
              allocation: { ip: '124.playit.gg', port: 25566 },
            },
          ],
        },
      }),
    )
    const api = build(fetchImpl)

    const tunnels = await api.listTunnels()

    expect(tunnels).toEqual([
      { tunnelId: 'tunnel-1', host: '123.playit.gg', port: 25565 },
      { tunnelId: 'tunnel-2', host: '124.playit.gg', port: 25566 },
    ])
  })

  it('deletes a tunnel', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ data: { ok: true } }))
    const api = build(fetchImpl)

    await api.deleteTunnel('tunnel-1')

    const [url, init] = (fetchImpl as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.playit.gg/tunnels/delete')
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(init.body))).toEqual({ tunnel_id: 'tunnel-1' })
  })

  it('treats a 404 on delete as success', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ error: 'not found' }, 404))
    const api = build(fetchImpl)

    await expect(api.deleteTunnel('missing')).resolves.toBeUndefined()
  })

  it('maps 401/403 to PlayitAuthError', async () => {
    const api = build(async () => jsonResponse({ error: 'denied' }, 401))
    await expect(api.listTunnels()).rejects.toBeInstanceOf(PlayitAuthError)
  })

  it('maps 429 to PlayitRateLimitError', async () => {
    const api = build(async () => jsonResponse({ error: 'slow down' }, 429))
    await expect(api.listTunnels()).rejects.toBeInstanceOf(PlayitRateLimitError)
  })

  it('maps 404 to PlayitNotFoundError', async () => {
    const api = build(async () => jsonResponse({ error: 'gone' }, 404))
    await expect(api.listTunnels()).rejects.toBeInstanceOf(PlayitNotFoundError)
  })

  it('maps other statuses to PlayitApiError', async () => {
    const api = build(async () => jsonResponse({ error: 'boom' }, 500))
    await expect(api.listTunnels()).rejects.toBeInstanceOf(PlayitApiError)
  })

  it('throws PlayitAuthError when no api key is configured', async () => {
    const api = new HttpPlayitApi({ baseUrl: 'https://api.playit.gg', fetchImpl: jest.fn() })
    await expect(api.listTunnels()).rejects.toBeInstanceOf(PlayitAuthError)
  })
})
