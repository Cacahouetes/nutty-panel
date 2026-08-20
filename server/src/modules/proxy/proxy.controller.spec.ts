import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { JwtAuthGuard } from '../auth/auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { ProxyController } from './proxy.controller'
import { PROXY_SERVICE, type SmartProxyService } from './smart-proxy.service'

class FakeProxyService implements SmartProxyService {
  started = 0
  stopped = 0
  refreshed = 0

  async start(): Promise<void> {
    this.started += 1
  }

  async stop(): Promise<void> {
    this.stopped += 1
  }

  async refresh(): Promise<void> {
    this.refreshed += 1
  }

  async getStatus() {
    return {
      publicPort: 25565,
      listening: true,
      routes: await this.getRoutes(),
    }
  }

  async getRoutes() {
    return [
      {
        serverId: 'lobby',
        name: 'Lobby',
        hostnames: ['lobby.play.example.com'],
        targetHost: '127.0.0.1',
        targetPort: 25566,
        isDefault: false,
        online: true,
      },
    ]
  }
}

describe('ProxyController (HTTP)', () => {
  let app: INestApplication
  let service: FakeProxyService

  beforeEach(async () => {
    service = new FakeProxyService()
    const moduleRef = await Test.createTestingModule({
      controllers: [ProxyController],
      providers: [{ provide: PROXY_SERVICE, useValue: service }],
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

  it('reports the proxy status', async () => {
    const res = await request(app.getHttpServer()).get('/api/proxy/status').expect(200)

    expect(res.body).toEqual({
      publicPort: 25565,
      listening: true,
      routes: [
        {
          serverId: 'lobby',
          name: 'Lobby',
          hostnames: ['lobby.play.example.com'],
          targetHost: '127.0.0.1',
          targetPort: 25566,
          isDefault: false,
          online: true,
        },
      ],
    })
  })

  it('lists routes with online state', async () => {
    const res = await request(app.getHttpServer()).get('/api/proxy/routes').expect(200)

    expect(res.body).toHaveLength(1)
    expect(res.body[0].online).toBe(true)
  })

  it('restarts the proxy on refresh', async () => {
    await request(app.getHttpServer()).post('/api/proxy/refresh').expect(204)

    expect(service.refreshed).toBe(1)
  })
})
