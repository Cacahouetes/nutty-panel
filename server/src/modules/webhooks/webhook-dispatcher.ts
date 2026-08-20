import type { AppEvent } from '../events/event'
import type { WebhookHttpClient } from './webhook-http-client'
import type { WebhookFormatter } from './webhook-formatter'
import type { WebhookSignature } from './webhook-signature'
import type { WebhookDefinition } from './webhook'

export interface WebhookDispatcher {
  dispatch(definition: WebhookDefinition, event: AppEvent): Promise<void>
  retryDue(now: Date): Promise<number>
  pendingCount(): number
}

export const WEBHOOK_DISPATCHER = Symbol('WebhookDispatcher')

export interface WebhookDispatcherDeps {
  httpClient: WebhookHttpClient
  formatter: WebhookFormatter
  signature: WebhookSignature
  clock?: () => Date
  baseRetryMs?: number
  maxAttempts?: number
}

interface PendingDelivery {
  definition: WebhookDefinition
  event: AppEvent
  attempts: number
  nextAttemptAt: number
}

export function createWebhookDispatcher(deps: WebhookDispatcherDeps): WebhookDispatcher {
  return new DefaultWebhookDispatcher(deps)
}

class DefaultWebhookDispatcher implements WebhookDispatcher {
  private readonly pending: PendingDelivery[] = []
  private readonly baseRetryMs: number
  private readonly maxAttempts: number

  constructor(private readonly deps: WebhookDispatcherDeps) {
    this.baseRetryMs = deps.baseRetryMs ?? 5_000
    this.maxAttempts = deps.maxAttempts ?? 5
  }

  async dispatch(definition: WebhookDefinition, event: AppEvent): Promise<void> {
    if (!definition.enabled || !definition.events.includes(event.type)) {
      return
    }
    try {
      await this.post(definition, event)
    } catch {
      this.enqueue(definition, event, 0)
    }
  }

  async retryDue(now: Date): Promise<number> {
    const due = this.pending.filter((item) => item.nextAttemptAt <= now.getTime())
    this.pending.splice(
      0,
      this.pending.length,
      ...this.pending.filter((item) => item.nextAttemptAt > now.getTime()),
    )
    let delivered = 0
    for (const item of due) {
      try {
        await this.post(item.definition, item.event)
        delivered += 1
      } catch {
        const attempts = item.attempts + 1
        if (attempts < this.maxAttempts) {
          this.enqueue(item.definition, item.event, attempts)
        }
      }
    }
    return delivered
  }

  pendingCount(): number {
    return this.pending.length
  }

  private enqueue(definition: WebhookDefinition, event: AppEvent, attempts: number): void {
    const now = this.now().getTime()
    const delay = this.baseRetryMs * Math.pow(2, attempts)
    this.pending.push({ definition, event, attempts, nextAttemptAt: now + delay })
  }

  private post(definition: WebhookDefinition, event: AppEvent): Promise<void> {
    const body = this.deps.formatter.format(definition.type, event)
    const signature = this.deps.signature.sign(body, definition.secret)
    return this.deps.httpClient.post(definition.url, body, {
      'Content-Type': 'application/json',
      'X-Nutty-Signature': signature,
    })
  }

  private now(): Date {
    return this.deps.clock ? this.deps.clock() : new Date()
  }
}
