import { createHmac, randomBytes } from 'node:crypto'

export interface WebhookSignature {
  sign(payload: string, secret: string): string
  generateSecret(): string
}

export const WEBHOOK_SIGNATURE = Symbol('WebhookSignature')

export class HmacWebhookSignature implements WebhookSignature {
  sign(payload: string, secret: string): string {
    const digest = createHmac('sha256', secret).update(payload).digest('hex')
    return `sha256=${digest}`
  }

  generateSecret(): string {
    return randomBytes(32).toString('hex')
  }
}
