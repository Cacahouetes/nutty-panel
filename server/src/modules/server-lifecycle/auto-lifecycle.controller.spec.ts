import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AutoLifecycleController } from './auto-lifecycle.controller'
import { AutoLifecycleNotFoundError, AutoLifecycleValidationError } from './auto-lifecycle.errors'
import { AUTO_LIFECYCLE_SERVICE, type AutoLifecycleService } from './auto-lifecycle.service'

class FakeAutoLifecycleService implements AutoLifecycleService {
  async getPolicy(serverId: string) {
    if (serverId === 'missing') {
      throw new AutoLifecycleNotFoundError(`server not found: ${serverId}`)
    }
    return { serverId, enabled: true, inactiveMinutes: 10 }
  }

  async setPolicy(serverId: string, input: { enabled?: boolean; inactiveMinutes?: number }) {
    if (serverId === 'missing') {
      throw new AutoLifecycleNotFoundError(`server not found: ${serverId}`)
    }
    if (input.inactiveMinutes !== undefined && input.inactiveMinutes < 1) {
      throw new AutoLifecycleValidationError('inactiveMinutes must be at least 1')
    }
    return {
      serverId,
      enabled: input.enabled ?? false,
      inactiveMinutes: input.inactiveMinutes ?? 30,
    }
  }

  async handleConnection(): Promise<void> {}
  async runDue(): Promise<string[]> {
    return []
  }
}

describe('AutoLifecycleController (HTTP)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AutoLifecycleController],
      providers: [{ provide: AUTO_LIFECYCLE_SERVICE, useValue: new FakeAutoLifecycleService() }],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns the auto-start policy of a server', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/servers/server-1/auto-start')
      .expect(200)

    expect(res.body).toEqual({ serverId: 'server-1', enabled: true, inactiveMinutes: 10 })
  })

  it('updates the auto-start policy', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/servers/server-1/auto-start')
      .send({ enabled: true, inactiveMinutes: 15 })
      .expect(200)

    expect(res.body).toEqual({ serverId: 'server-1', enabled: true, inactiveMinutes: 15 })
  })

  it('returns HTTP 404 for an unknown server', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/servers/missing/auto-start')
      .expect(404)

    expect(res.body.error).toBe('AutoLifecycleNotFoundError')
  })

  it('returns HTTP 400 for invalid inactiveMinutes', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/servers/server-1/auto-start')
      .send({ inactiveMinutes: 0 })
      .expect(400)

    expect(res.body.error).toBe('AutoLifecycleValidationError')
  })
})
