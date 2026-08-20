import type { WebhookEventName } from '../events/event'

export const WEBHOOK_TYPES = ['generic', 'discord', 'slack'] as const
export type WebhookType = (typeof WEBHOOK_TYPES)[number]

export interface WebhookDefinition {
  id: string
  name: string
  url: string
  secret: string
  type: WebhookType
  events: WebhookEventName[]
  enabled: boolean
  createdAt: Date
}

export interface CreateWebhookInput {
  name: string
  url: string
  type?: WebhookType
  secret?: string
  events: WebhookEventName[]
  enabled?: boolean
}

export function isWebhookType(value: string): value is WebhookType {
  return (WEBHOOK_TYPES as readonly string[]).includes(value)
}
