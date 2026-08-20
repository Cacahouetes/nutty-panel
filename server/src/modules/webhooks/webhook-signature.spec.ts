import { createHmac } from 'node:crypto'
import { describe, it, expect } from '@jest/globals'
import { HmacWebhookSignature } from './webhook-signature'

describe('HmacWebhookSignature', () => {
  const signature = new HmacWebhookSignature()

  it('signs a payload with an HMAC-SHA256 known answer', () => {
    const expected = `sha256=${createHmac('sha256', 'secret-key')
      .update('{"event":"server.started"}')
      .digest('hex')}`

    expect(signature.sign('{"event":"server.started"}', 'secret-key')).toBe(expected)
  })

  it('produces a different signature for a different secret', () => {
    const a = signature.sign('payload', 'secret-a')
    const b = signature.sign('payload', 'secret-b')
    expect(a).not.toBe(b)
  })

  it('produces a different signature for a different payload', () => {
    const a = signature.sign('payload-a', 'secret')
    const b = signature.sign('payload-b', 'secret')
    expect(a).not.toBe(b)
  })

  it('generates a 64-char hex secret', () => {
    const secret = signature.generateSecret()
    expect(secret).toMatch(/^[0-9a-f]{64}$/)
    expect(signature.generateSecret()).not.toBe(secret)
  })
})
