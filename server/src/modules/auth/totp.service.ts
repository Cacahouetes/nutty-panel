import { authenticator } from 'otplib'

export interface TotpService {
  generateSecret(): string
  generateUri(secret: string, email: string): string
  verify(secret: string, code: string): boolean
}

export const TOTP_SERVICE = Symbol('TotpService')

export class OtplibTotpService implements TotpService {
  private readonly authenticator = authenticator.clone()

  constructor() {
    this.authenticator.options = { window: 1 }
  }

  generateSecret(): string {
    return this.authenticator.generateSecret()
  }

  generateUri(secret: string, email: string): string {
    return this.authenticator.keyuri(email, 'Nutty Panel', secret)
  }

  verify(secret: string, code: string): boolean {
    try {
      return this.authenticator.check(code, secret)
    } catch {
      return false
    }
  }
}
