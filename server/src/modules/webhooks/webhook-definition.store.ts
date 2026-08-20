import type { CreateWebhookInput, WebhookDefinition } from './webhook'

export interface WebhookDefinitionStore {
  create(input: CreateWebhookInput): Promise<WebhookDefinition>
  findAll(): Promise<WebhookDefinition[]>
  findById(id: string): Promise<WebhookDefinition | undefined>
  remove(id: string): Promise<void>
}

export const WEBHOOK_DEFINITION_STORE = Symbol('WebhookDefinitionStore')
