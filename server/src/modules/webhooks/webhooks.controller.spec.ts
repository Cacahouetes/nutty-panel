import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { JwtAuthGuard } from '../auth/auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import type { WebhookEventName } from '../events/event'
import { ApiRateLimitGuard } from './api-rate-limiter'
import type { CreateWebhookInput, WebhookDefinition } from './webhook'
import {
  WEBHOOKS_SERVICE,
  WebhookNotFoundError,
  WebhookValidationError,
  type WebhooksService,
} from './webhooks.service'
import { WebhooksController } from './webhooks.controller'

class FakeWebhooksService implements WebhooksService {
  private readonly webhooks = new Map<string, WebhookDefinition>()
  private nextId = 1

  async createWebhook(input: CreateWebhookInput): Promise<WebhookDefinition> {
    if (!input.url || !input.url.startsWith('https://')) {
      throw new WebhookValidationError('url must be a valid http(s) url')
    }
    if (!input.events || input.events.length === 0) {
      throw new WebhookValidationError('at least one event is required')
    }
    const webhook: WebhookDefinition = {
      id: `wh-${this.nextId++}`,
      name: input.name,
      url: input.url,
      secret: input.secret ?? 'a'.repeat(64),
      type: input.type ?? 'generic',
      events: input.events,
      enabled: input.enabled ?? true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }
    this.webhooks.set(webhook.id, webhook)
    return webhook
  }

  async listWebhooks(): Promise<WebhookDefinition[]> {
    return [...this.webhooks.values()]
  }

  async getWebhook(id: string): Promise<WebhookDefinition> {
    const webhook = this.webhooks.get(id)
    if (!webhook) {
      throw new WebhookNotFoundError(`webhook not found: ${id}`)
    }
    return webhook
  }

  async deleteWebhook(id: string): Promise<void> {
    if (!this.webhooks.delete(id)) {
      throw new WebhookNotFoundError(`webhook not found: ${id}`)
    }
  }

  listEventNames(): WebhookEventName[] {
    return ['server.started', 'server.stopped', 'backup.completed']
  }
}

describe('WebhooksController (HTTP)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [{ provide: WEBHOOKS_SERVICE, useValue: new FakeWebhooksService() }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ApiRateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('creates a webhook', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/webhooks')
      .send({
        name: 'Discord ops',
        url: 'https://discord.example/hook',
        events: ['server.started'],
      })
      .expect(201)

    expect(res.body.id).toBeTruthy()
    expect(res.body.name).toBe('Discord ops')
    expect(res.body.secret).toHaveLength(64)
  })

  it('rejects an invalid url with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/webhooks')
      .send({ name: 'Bad', url: 'ftp://nope', events: ['server.started'] })
      .expect(400)

    expect(res.body.error).toBe('WebhookValidationError')
  })

  it('lists webhooks', async () => {
    await request(app.getHttpServer())
      .post('/api/webhooks')
      .send({
        name: 'Discord ops',
        url: 'https://discord.example/hook',
        events: ['server.started'],
      })
      .expect(201)

    const res = await request(app.getHttpServer()).get('/api/webhooks').expect(200)

    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Discord ops')
  })

  it('lists the available events', async () => {
    const res = await request(app.getHttpServer()).get('/api/webhooks/events').expect(200)

    expect(res.body.events).toContain('backup.completed')
  })

  it('returns a webhook by id', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/webhooks')
      .send({
        name: 'Discord ops',
        url: 'https://discord.example/hook',
        events: ['server.started'],
      })
      .expect(201)

    const res = await request(app.getHttpServer())
      .get(`/api/webhooks/${created.body.id}`)
      .expect(200)

    expect(res.body.name).toBe('Discord ops')
  })

  it('returns 404 for an unknown webhook', async () => {
    const res = await request(app.getHttpServer()).get('/api/webhooks/missing').expect(404)

    expect(res.body.error).toBe('WebhookNotFoundError')
  })

  it('deletes a webhook with 204', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/webhooks')
      .send({
        name: 'Discord ops',
        url: 'https://discord.example/hook',
        events: ['server.started'],
      })
      .expect(201)

    await request(app.getHttpServer()).delete(`/api/webhooks/${created.body.id}`).expect(204)
    await request(app.getHttpServer())
      .get('/api/webhooks')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(0)
      })
  })

  it('returns 404 when deleting an unknown webhook', async () => {
    await request(app.getHttpServer()).delete('/api/webhooks/missing').expect(404)
  })
})
