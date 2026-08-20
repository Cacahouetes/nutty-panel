export const WEBHOOK_EVENT_NAMES = [
  'server.created',
  'server.started',
  'server.stopped',
  'server.removed',
  'backup.completed',
  'backup.failed',
] as const

export type WebhookEventName = (typeof WEBHOOK_EVENT_NAMES)[number]

export interface ServerEventData {
  serverId: string
  name: string
}

export interface BackupEventData {
  backupId: string
  serverId: string
  serverName?: string
  sizeBytes?: number
  error?: string
}

export type AppEvent =
  | { type: 'server.created'; occurredAt: Date; data: ServerEventData }
  | { type: 'server.started'; occurredAt: Date; data: ServerEventData }
  | { type: 'server.stopped'; occurredAt: Date; data: ServerEventData }
  | { type: 'server.removed'; occurredAt: Date; data: ServerEventData }
  | { type: 'backup.completed'; occurredAt: Date; data: BackupEventData }
  | { type: 'backup.failed'; occurredAt: Date; data: BackupEventData }

export function isWebhookEventName(value: string): value is WebhookEventName {
  return (WEBHOOK_EVENT_NAMES as readonly string[]).includes(value)
}
