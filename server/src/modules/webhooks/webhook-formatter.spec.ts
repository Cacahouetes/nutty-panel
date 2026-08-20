import { describe, it, expect } from '@jest/globals'
import { JsonWebhookFormatter } from './webhook-formatter'
import type { AppEvent } from '../events/event'

const started: AppEvent = {
  type: 'server.started',
  occurredAt: new Date('2026-01-01T00:00:00Z'),
  data: { serverId: 'srv-1', name: 'Survival' },
}

const backupCompleted: AppEvent = {
  type: 'backup.completed',
  occurredAt: new Date('2026-01-02T00:00:00Z'),
  data: { backupId: 'b-1', serverId: 'srv-1', serverName: 'Survival', sizeBytes: 1024 },
}

describe('JsonWebhookFormatter', () => {
  const formatter = new JsonWebhookFormatter()

  it('serializes a generic payload with event metadata', () => {
    expect(JSON.parse(formatter.format('generic', started))).toEqual({
      event: 'server.started',
      occurredAt: '2026-01-01T00:00:00.000Z',
      data: { serverId: 'srv-1', name: 'Survival' },
    })
  })

  it('formats a discord payload with a content message', () => {
    expect(JSON.parse(formatter.format('discord', backupCompleted))).toEqual({
      content: 'Backup completed for server "Survival" (1024 bytes)',
    })
  })

  it('formats a slack payload with a text message', () => {
    expect(JSON.parse(formatter.format('slack', started))).toEqual({
      text: 'Server "Survival" started',
    })
  })

  it('describes backup failures with the error message', () => {
    const failed: AppEvent = {
      type: 'backup.failed',
      occurredAt: new Date('2026-01-02T00:00:00Z'),
      data: { backupId: 'b-2', serverId: 'srv-1', error: 'export exploded' },
    }

    expect(JSON.parse(formatter.format('slack', failed))).toEqual({
      text: 'Backup failed for server "srv-1": export exploded',
    })
  })

  it('produces valid JSON strings', () => {
    for (const type of ['generic', 'discord', 'slack'] as const) {
      expect(() => {
        JSON.parse(formatter.format(type, started))
      }).not.toThrow()
    }
  })
})
