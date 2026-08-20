import type { AppEvent } from '../events/event'
import type { WebhookType } from './webhook'

export interface WebhookFormatter {
  format(type: WebhookType, event: AppEvent): string
}

export const WEBHOOK_FORMATTER = Symbol('WebhookFormatter')

export class JsonWebhookFormatter implements WebhookFormatter {
  format(type: WebhookType, event: AppEvent): string {
    if (type === 'discord') {
      return JSON.stringify({ content: describe(event) })
    }
    if (type === 'slack') {
      return JSON.stringify({ text: describe(event) })
    }
    return JSON.stringify({
      event: event.type,
      occurredAt: event.occurredAt.toISOString(),
      data: event.data,
    })
  }
}

function describe(event: AppEvent): string {
  switch (event.type) {
    case 'server.created':
      return `Server "${event.data.name}" created`
    case 'server.started':
      return `Server "${event.data.name}" started`
    case 'server.stopped':
      return `Server "${event.data.name}" stopped`
    case 'server.removed':
      return `Server "${event.data.name}" removed`
    case 'backup.completed':
      return `Backup completed for server "${event.data.serverName ?? event.data.serverId}" (${
        event.data.sizeBytes ?? 0
      } bytes)`
    case 'backup.failed':
      return `Backup failed for server "${event.data.serverName ?? event.data.serverId}"${
        event.data.error ? `: ${event.data.error}` : ''
      }`
  }
}
