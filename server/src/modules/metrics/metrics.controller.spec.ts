import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { MetricsController } from './metrics.controller'
import { MetricsNotFoundError, MetricsUnavailableError } from './metrics.errors'
import { METRICS_SERVICE, type MetricsService } from './metrics.service'

class FakeMetricsService implements MetricsService {
  async getServerMetrics(serverId: string) {
    if (serverId === 'missing') throw new MetricsNotFoundError(`server not found: ${serverId}`)
    if (serverId === 'stopped') throw new MetricsUnavailableError(`server not running: ${serverId}`)
    return {
      serverId,
      cpuPercent: 25,
      memoryUsageBytes: 512 * 1024 * 1024,
      memoryLimitBytes: 2048 * 1024 * 1024,
      memoryPercent: 25,
      readAt: '2026-01-01T00:00:00.000Z',
    }
  }
}

describe('MetricsController (HTTP)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [{ provide: METRICS_SERVICE, useValue: new FakeMetricsService() }],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns live metrics for a running server', async () => {
    const res = await request(app.getHttpServer()).get('/api/servers/server-1/metrics').expect(200)

    expect(res.body).toEqual({
      serverId: 'server-1',
      cpuPercent: 25,
      memoryUsageBytes: 512 * 1024 * 1024,
      memoryLimitBytes: 2048 * 1024 * 1024,
      memoryPercent: 25,
      readAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('returns HTTP 404 for an unknown server', async () => {
    const res = await request(app.getHttpServer()).get('/api/servers/missing/metrics').expect(404)

    expect(res.body.error).toBe('MetricsNotFoundError')
  })

  it('returns HTTP 409 when the server is not running', async () => {
    const res = await request(app.getHttpServer()).get('/api/servers/stopped/metrics').expect(409)

    expect(res.body.error).toBe('MetricsUnavailableError')
  })
})
