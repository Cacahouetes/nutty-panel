import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { JwtAuthGuard } from '../../auth/auth.guard'
import { RolesGuard } from '../../auth/roles.guard'
import { PlayitController } from './playit.controller'
import { PlayitServerNotFoundError, PLAYIT_SERVICE, type PlayitService } from './playit.service'
import { PlayitAuthError, PlayitRateLimitError } from './playit-api'
import type { PlayitTunnel } from './playit-tunnel-store'

class FakePlayitService implements PlayitService {
  readonly tunnels = new Map<string, PlayitTunnel>()

  async ensureTunnel(serverId: string): Promise<PlayitTunnel> {
    if (!this.tunnels.has(serverId)) {
      throw new PlayitServerNotFoundError(`server not found: ${serverId}`)
    }
    return this.tunnels.get(serverId)!
  }

  async getTunnel(serverId: string): Promise<PlayitTunnel> {
    const tunnel = this.tunnels.get(serverId)
    if (!tunnel) {
      throw new PlayitServerNotFoundError(`no tunnel configured for server: ${serverId}`)
    }
    return tunnel
  }

  listTunnels(): PlayitTunnel[] {
    return [...this.tunnels.values()]
  }

  async removeTunnel(serverId: string): Promise<void> {
    this.tunnels.delete(serverId)
  }

  async getStatus() {
    return { agent: 'running' as const, tunnels: this.tunnels.size }
  }
}

describe('PlayitController (HTTP)', () => {
  let app: INestApplication
  let service: FakePlayitService

  beforeEach(async () => {
    service = new FakePlayitService()
    const moduleRef = await Test.createTestingModule({
      controllers: [PlayitController],
      providers: [{ provide: PLAYIT_SERVICE, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('reports agent status', async () => {
    const res = await request(app.getHttpServer()).get('/api/playit/status').expect(200)

    expect(res.body).toEqual({ agent: 'running', tunnels: 0 })
  })

  it('lists tunnels', async () => {
    await request(app.getHttpServer()).post('/api/playit/servers/missing/tunnels').expect(404)

    const res = await request(app.getHttpServer()).get('/api/playit/tunnels').expect(200)

    expect(res.body).toEqual([])
  })

  it('returns the tunnel of a server', async () => {
    service.tunnels.set('server-1', {
      serverId: 'server-1',
      serverName: 'Survival',
      tunnelId: 'tunnel-1',
      host: '123.playit.gg',
      port: 25565,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })

    const res = await request(app.getHttpServer())
      .get('/api/playit/servers/server-1/tunnels')
      .expect(200)

    expect(res.body).toMatchObject({
      serverId: 'server-1',
      tunnelId: 'tunnel-1',
      host: '123.playit.gg',
      port: 25565,
    })
  })

  it('returns 404 for a server without a tunnel', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/playit/servers/server-1/tunnels')
      .expect(404)

    expect(res.body.error).toBe('PlayitServerNotFoundError')
  })

  it('returns 404 when ensuring a tunnel for an unknown server', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/playit/servers/missing/tunnels')
      .expect(404)

    expect(res.body.error).toBe('PlayitServerNotFoundError')
  })

  it('removes a tunnel with 204', async () => {
    service.tunnels.set('server-1', {
      serverId: 'server-1',
      serverName: 'Survival',
      tunnelId: 'tunnel-1',
      host: '123.playit.gg',
      port: 25565,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    })

    await request(app.getHttpServer()).delete('/api/playit/servers/server-1/tunnels').expect(204)
    expect(service.tunnels.size).toBe(0)
  })

  it('maps auth failures to 401', async () => {
    jest.spyOn(service, 'getStatus').mockRejectedValueOnce(new PlayitAuthError())

    await request(app.getHttpServer()).get('/api/playit/status').expect(401)
  })

  it('maps rate limit failures to 429', async () => {
    jest.spyOn(service, 'getStatus').mockRejectedValueOnce(new PlayitRateLimitError())

    await request(app.getHttpServer()).get('/api/playit/status').expect(429)
  })
})
