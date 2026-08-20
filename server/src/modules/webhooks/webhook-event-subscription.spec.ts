import { describe, it, expect, afterEach } from '@jest/globals'
import { createHmac } from 'node:crypto'
import http, { type IncomingMessage, type ServerResponse } from 'node:http'
import net from 'node:net'
import { InMemoryEventBus } from '../events/event-bus'
import type { AppEvent } from '../events/event'
import { InMemoryWebhookDefinitionStore } from './in-memory.webhook-definition.store'
import { HmacWebhookSignature } from './webhook-signature'
import { JsonWebhookFormatter } from './webhook-formatter'
import { HttpWebhookClient } from './webhook-http-client'
import { createWebhookDispatcher } from './webhook-dispatcher'
import { WebhookEventSubscription } from './webhook-event-subscription'

interface CapturedRequest {
  body: string
  headers: IncomingMessage['headers']
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const poll = (): void => {
      if (predicate()) {
        resolve()
        return
      }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error('timed out waiting for webhook delivery'))
        return
      }
      setTimeout(poll, 20)
    }
    poll()
  })
}

const startedEvent: AppEvent = {
  type: 'server.started',
  occurredAt: new Date('2026-01-02T00:00:00Z'),
  data: { serverId: 'srv-1', name: 'Survival' },
}

describe('webhook delivery end-to-end', () => {
  const servers: http.Server[] = []

  afterEach(async () => {
    for (const server of servers) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
    servers.length = 0
  })

  it('delivers a signed payload to a local webhook endpoint', async () => {
    const captured: CapturedRequest[] = []
    const port = await getFreePort()
    const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        captured.push({ body: Buffer.concat(chunks).toString(), headers: req.headers })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('{"ok":true}')
      })
    })
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(port, resolve))

    const bus = new InMemoryEventBus()
    const store = new InMemoryWebhookDefinitionStore()
    const signature = new HmacWebhookSignature()
    const formatter = new JsonWebhookFormatter()
    const dispatcher = createWebhookDispatcher({
      httpClient: new HttpWebhookClient(1000),
      formatter,
      signature,
    })
    const subscription = new WebhookEventSubscription(bus, store, dispatcher)
    subscription.onModuleInit()

    const secret = 'integration-secret'
    await store.create({
      name: 'local hook',
      url: `http://127.0.0.1:${port}/hook`,
      secret,
      type: 'generic',
      events: ['server.started'],
    })

    bus.emit(startedEvent)

    await waitFor(() => captured.length === 1)

    const received = captured[0]
    expect(JSON.parse(received.body)).toEqual({
      event: 'server.started',
      occurredAt: '2026-01-02T00:00:00.000Z',
      data: { serverId: 'srv-1', name: 'Survival' },
    })

    const expectedSignature = `sha256=${createHmac('sha256', secret)
      .update(received.body)
      .digest('hex')}`
    expect(received.headers['x-nutty-signature']).toBe(expectedSignature)
    expect(received.headers['content-type']).toContain('application/json')

    subscription.onModuleDestroy()
  })
})
