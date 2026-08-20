import { isWebhookEventName, WEBHOOK_EVENT_NAMES, type WebhookEventName } from '../events/event'
import type { WebhookDefinitionStore } from './webhook-definition.store'
import { isWebhookType, type CreateWebhookInput, type WebhookDefinition } from './webhook'
import type { WebhookSignature } from './webhook-signature'

export class WebhookValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WebhookValidationError'
  }
}

export class WebhookNotFoundError extends Error {
  constructor(message = 'webhook not found') {
    super(message)
    this.name = 'WebhookNotFoundError'
  }
}

export interface WebhooksService {
  createWebhook(input: CreateWebhookInput): Promise<WebhookDefinition>
  listWebhooks(): Promise<WebhookDefinition[]>
  getWebhook(id: string): Promise<WebhookDefinition>
  deleteWebhook(id: string): Promise<void>
  listEventNames(): WebhookEventName[]
}

export const WEBHOOKS_SERVICE = Symbol('WebhooksService')

export interface WebhooksServiceDeps {
  store: WebhookDefinitionStore
  signature: WebhookSignature
}

export function createWebhooksService(deps: WebhooksServiceDeps): WebhooksService {
  return new DefaultWebhooksService(deps)
}

class DefaultWebhooksService implements WebhooksService {
  constructor(private readonly deps: WebhooksServiceDeps) {}

  async createWebhook(input: CreateWebhookInput): Promise<WebhookDefinition> {
    if (!input.name || !input.name.trim()) {
      throw new WebhookValidationError('name is required')
    }
    if (!input.url || !isHttpUrl(input.url)) {
      throw new WebhookValidationError('url must be a valid http(s) url')
    }
    if (!input.events || input.events.length === 0) {
      throw new WebhookValidationError('at least one event is required')
    }
    for (const event of input.events) {
      if (!isWebhookEventName(event)) {
        throw new WebhookValidationError(`unsupported event: ${String(event)}`)
      }
    }
    if (input.type !== undefined && !isWebhookType(input.type)) {
      throw new WebhookValidationError(`unsupported webhook type: ${String(input.type)}`)
    }
    if (input.secret !== undefined && !input.secret.trim()) {
      throw new WebhookValidationError('secret must not be empty')
    }
    const secret = input.secret ?? this.deps.signature.generateSecret()
    return this.deps.store.create({
      ...input,
      name: input.name.trim(),
      secret,
      events: [...input.events],
    })
  }

  async listWebhooks(): Promise<WebhookDefinition[]> {
    return this.deps.store.findAll()
  }

  async getWebhook(id: string): Promise<WebhookDefinition> {
    return this.mustFind(id)
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.mustFind(id)
    await this.deps.store.remove(id)
  }

  listEventNames(): WebhookEventName[] {
    return [...WEBHOOK_EVENT_NAMES]
  }

  private async mustFind(id: string): Promise<WebhookDefinition> {
    const webhook = await this.deps.store.findById(id)
    if (!webhook) {
      throw new WebhookNotFoundError(`webhook not found: ${id}`)
    }
    return webhook
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
