import { randomUUID } from 'node:crypto'
import { JwtService } from '@nestjs/jwt'
import type { User, UserRole } from './user'

export interface TokenPayload {
  sub: string
  email: string
  role: UserRole
  type: 'access' | 'refresh'
  jti: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface TokenService {
  issue(user: User): TokenPair
  verifyAccess(token: string): TokenPayload
  verifyRefresh(token: string): TokenPayload
}

export const TOKEN_SERVICE = Symbol('TokenService')

export class JwtTokenService implements TokenService {
  constructor(private readonly jwt: JwtService) {}

  issue(user: User): TokenPair {
    const base = { sub: user.id, email: user.email, role: user.role }
    const accessToken = this.jwt.sign(
      { ...base, type: 'access', jti: randomUUID() },
      { expiresIn: '15m' },
    )
    const refreshToken = this.jwt.sign(
      { ...base, type: 'refresh', jti: randomUUID() },
      { expiresIn: '7d' },
    )
    return { accessToken, refreshToken }
  }

  verifyAccess(token: string): TokenPayload {
    const payload = this.jwt.verify<TokenPayload>(token)
    if (payload.type !== 'access') throw new Error('not an access token')
    return payload
  }

  verifyRefresh(token: string): TokenPayload {
    const payload = this.jwt.verify<TokenPayload>(token)
    if (payload.type !== 'refresh') throw new Error('not a refresh token')
    return payload
  }
}
