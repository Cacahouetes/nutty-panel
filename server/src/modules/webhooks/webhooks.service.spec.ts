import { describe, it, expect } from '@jest/globals'
import {
  createWebhooksService,
  WebhookNotFoundError,
  WebhookValidationError,
  type WebhooksService,
} from './webhooks.service'
import { InMemoryWebhookDefinitionStore } from './in-memory.webhook-definition.store'
import { HmacWebhookSignature } from './webhook-signature'
import type { CreateWebhookInput } from './webhook'

function buildService(): {
  service: WebhooksService
  store: InMemoryWebhookDefinitionStore
} {
  const store = new InMemoryWebhookDefinitionStore()
  const signature = new HmacWebhookSignature()
  const service = createWebhooksService({ store, signature })
  return { service, store }
}

function validInput(): CreateWebhookInput {
  return {
    name: 'Discord ops',
    url: 'https://discord.com/api/webhooks/123/abc',
    events: ['server.started', 'server.stopped'],
  }
}

describe('WebhooksService', () => {
  it('creates a webhook with a generated secret by default', async () => {
    const { service } = buildService()

    const webhook = await service.createWebhook(validInput())

    expect(webhook.id).toBeTruthy()
    expect(webhook.name).toBe('Discord ops')
    expect(webhook.type).toBe('generic')
    expect(webhook.enabled).toBe(true)
    expect(webhook.secret).toMatch(/^[0-9a-f]{64}$/)
    expect(webhook.events).toEqual(['server.started', 'server.stopped'])
  })

  it('keeps a user-provided secret', async () => {
    const { service } = buildService()

    const webhook = await service.createWebhook({
      ...validInput(),
      secret: 'my-secret',
      type: 'discord',
      enabled: false,
    })

    expect(webhook.secret).toBe('my-secret')
    expect(webhook.type).toBe('discord')
    expect(webhook.enabled).toBe(false)
  })

  it('rejects an empty name', async () => {
    const { service } = buildService()
    await expect(service.createWebhook({ ...validInput(), name: '' })).rejects.toBeInstanceOf(
      WebhookValidationError,
    )
  })

  it('rejects a non-http url', async () => {
    const { service } = buildService()
    await expect(
      service.createWebhook({ ...validInput(), url: 'ftp://nope' }),
    ).rejects.toBeInstanceOf(WebhookValidationError)
  })

  it('rejects an unknown event name', async () => {
    const { service } = buildService()
    await expect(
      service.createWebhook({ ...validInput(), events: ['server.joined' as never] }),
    ).rejects.toBeInstanceOf(WebhookValidationError)
  })

  it('rejects an empty event list', async () => {
    const { service } = buildService()
    await expect(service.createWebhook({ ...validInput(), events: [] })).rejects.toBeInstanceOf(
      WebhookValidationError,
    )
  })

  it('rejects an unknown webhook type', async () => {
    const { service } = buildService()
    await expect(
      service.createWebhook({ ...validInput(), type: 'teams' as never }),
    ).rejects.toBeInstanceOf(WebhookValidationError)
  })

  it('lists all webhooks', async () => {
    const { service } = buildService()
    await service.createWebhook(validInput())
    await service.createWebhook({ ...validInput(), name: 'Slack alerts' })

    const all = await service.listWebhooks()

    expect(all.map((w) => w.name)).toEqual(['Discord ops', 'Slack alerts'])
  })

  it('returns a webhook by id', async () => {
    const { service } = buildService()
    const created = await service.createWebhook(validInput())

    const found = await service.getWebhook(created.id)

    expect(found.id).toBe(created.id)
  })

  it('throws WebhookNotFoundError for a missing webhook', async () => {
    const { service } = buildService()
    await expect(service.getWebhook('missing')).rejects.toBeInstanceOf(WebhookNotFoundError)
  })

  it('deletes a webhook by id', async () => {
    const { service, store } = buildService()
    const created = await service.createWebhook(validInput())

    await service.deleteWebhook(created.id)

    expect(await store.findAll()).toHaveLength(0)
  })

  it('throws WebhookNotFoundError when deleting a missing webhook', async () => {
    const { service } = buildService()
    await expect(service.deleteWebhook('missing')).rejects.toBeInstanceOf(WebhookNotFoundError)
  })

  it('lists the available event names', () => {
    const { service } = buildService()

    const names = service.listEventNames()

    expect(names).toContain('server.started')
    expect(names).toContain('backup.completed')
  })
})
