import { randomUUID } from 'node:crypto'
import type { CreateWebhookInput, WebhookDefinition } from './webhook'
import type { WebhookDefinitionStore } from './webhook-definition.store'

export class InMemoryWebhookDefinitionStore implements WebhookDefinitionStore {
  private readonly webhooks: WebhookDefinition[] = []

  async create(input: CreateWebhookInput): Promise<WebhookDefinition> {
    const webhook: WebhookDefinition = {
      id: randomUUID(),
      name: input.name,
      url: input.url,
      secret: input.secret ?? '',
      type: input.type ?? 'generic',
      events: input.events,
      enabled: input.enabled ?? true,
      createdAt: new Date(),
    }
    this.webhooks.push(webhook)
    return webhook
  }

  async findAll(): Promise<WebhookDefinition[]> {
    return [...this.webhooks]
  }

  async findById(id: string): Promise<WebhookDefinition | undefined> {
    return this.webhooks.find((webhook) => webhook.id === id)
  }

  async remove(id: string): Promise<void> {
    const index = this.webhooks.findIndex((webhook) => webhook.id === id)
    if (index !== -1) {
      this.webhooks.splice(index, 1)
    }
  }
}
