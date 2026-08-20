import { describe, it, expect, beforeEach } from '@jest/globals'
import { createWebhookDispatcher, type WebhookDispatcher } from './webhook-dispatcher'
import type { WebhookHttpClient } from './webhook-http-client'
import type { WebhookFormatter } from './webhook-formatter'
import type { WebhookSignature } from './webhook-signature'
import type { WebhookDefinition } from './webhook'
import type { AppEvent } from '../events/event'

class FakeHttpClient implements WebhookHttpClient {
  calls: { url: string; body: string; headers: Record<string, string> }[] = []
  fail = false

  async post(url: string, body: string, headers: Record<string, string>): Promise<void> {
    if (this.fail) {
      throw new Error('network error')
    }
    this.calls.push({ url, body, headers })
  }
}

const formatter: WebhookFormatter = {
  format: () => '{"event":"server.started"}',
}

const signature: WebhookSignature = {
  sign: () => 'sha256=abc123',
  generateSecret: () => 'secret',
}

const definition: WebhookDefinition = {
  id: 'wh-1',
  name: 'Discord ops',
  url: 'https://discord.example/hook',
  secret: 's3cret',
  type: 'discord',
  events: ['server.started', 'backup.completed'],
  enabled: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
}

const event: AppEvent = {
  type: 'server.started',
  occurredAt: new Date('2026-01-02T00:00:00Z'),
  data: { serverId: 'srv-1', name: 'Survival' },
}

function build(): {
  dispatcher: WebhookDispatcher
  http: FakeHttpClient
  setNow: (iso: string) => void
} {
  const http = new FakeHttpClient()
  let now = new Date('2026-01-01T00:00:00Z')
  const dispatcher = createWebhookDispatcher({
    httpClient: http,
    formatter,
    signature,
    clock: () => now,
    baseRetryMs: 1000,
    maxAttempts: 3,
  })
  return { dispatcher, http, setNow: (iso: string) => (now = new Date(iso)) }
}

describe('WebhookDispatcher', () => {
  let ctx: ReturnType<typeof build>

  beforeEach(() => {
    ctx = build()
  })

  it('posts the signed body to the webhook url on success', async () => {
    await ctx.dispatcher.dispatch(definition, event)

    expect(ctx.http.calls).toEqual([
      {
        url: 'https://discord.example/hook',
        body: '{"event":"server.started"}',
        headers: {
          'Content-Type': 'application/json',
          'X-Nutty-Signature': 'sha256=abc123',
        },
      },
    ])
    expect(ctx.dispatcher.pendingCount()).toBe(0)
  })

  it('does nothing for a disabled webhook', async () => {
    await ctx.dispatcher.dispatch({ ...definition, enabled: false }, event)

    expect(ctx.http.calls).toHaveLength(0)
    expect(ctx.dispatcher.pendingCount()).toBe(0)
  })

  it('does nothing when the event is not subscribed', async () => {
    await ctx.dispatcher.dispatch(
      { ...definition, events: ['backup.completed'] },
      { ...event, type: 'server.stopped' },
    )

    expect(ctx.http.calls).toHaveLength(0)
    expect(ctx.dispatcher.pendingCount()).toBe(0)
  })

  it('enqueues a retry with backoff when the post fails', async () => {
    ctx.http.fail = true

    await ctx.dispatcher.dispatch(definition, event)

    expect(ctx.dispatcher.pendingCount()).toBe(1)
  })

  it('retries due deliveries and reports the count', async () => {
    ctx.http.fail = true
    await ctx.dispatcher.dispatch(definition, event)

    ctx.setNow('2026-01-01T00:00:02Z')
    ctx.http.fail = false
    const delivered = await ctx.dispatcher.retryDue(new Date('2026-01-01T00:00:02Z'))

    expect(delivered).toBe(1)
    expect(ctx.dispatcher.pendingCount()).toBe(0)
    expect(ctx.http.calls).toHaveLength(1)
  })

  it('does not retry deliveries that are not due yet', async () => {
    ctx.http.fail = true
    await ctx.dispatcher.dispatch(definition, event)

    ctx.http.fail = false
    const delivered = await ctx.dispatcher.retryDue(new Date('2026-01-01T00:00:00.500Z'))

    expect(delivered).toBe(0)
    expect(ctx.dispatcher.pendingCount()).toBe(1)
  })

  it('drops a delivery after the maximum attempts', async () => {
    ctx.http.fail = true
    await ctx.dispatcher.dispatch(definition, event)

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await ctx.dispatcher.retryDue(
        new Date(`2026-01-01T00:00:${String(attempt * 2).padStart(2, '0')}Z`),
      )
    }

    expect(ctx.dispatcher.pendingCount()).toBe(0)
    expect(ctx.http.calls).toHaveLength(0)
  })
})
