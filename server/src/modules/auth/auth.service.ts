import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { User, UserRole } from './user'
import type { UsersRepository } from './users.repository'
import type { PasswordHasher } from './password.service'
import type { TokenService } from './token.service'
import type { TotpService } from './totp.service'
import type { LoginThrottler } from './login.throttler'

export interface PublicUser {
  id: string
  email: string
  role: UserRole
  is2faEnabled: boolean
  createdAt: Date
}

export interface ApiKeySummary {
  id: string
  name: string
  createdAt: Date
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: PublicUser
}

export interface LoginInput {
  email: string
  password: string
  totpCode?: string
}

export interface AuthService {
  login(input: LoginInput): Promise<LoginResult>
  refresh(refreshToken: string): Promise<LoginResult>
  logout(refreshToken: string): Promise<void>
  getCurrentUser(userId: string): Promise<PublicUser>
  setupTotp(userId: string): Promise<{ secret: string; otpauthUrl: string }>
  enableTotp(userId: string, code: string): Promise<PublicUser>
  disableTotp(userId: string, code: string): Promise<PublicUser>
  createApiKey(userId: string, name: string): Promise<{ id: string; name: string; key: string }>
  listApiKeys(userId: string): Promise<ApiKeySummary[]>
  revokeApiKey(userId: string, keyId: string): Promise<void>
  resolveApiKey(key: string): Promise<PublicUser | null>
}

export const AUTH_SERVICE = Symbol('AuthService')

export class InvalidCredentialsError extends Error {
  constructor(message = 'invalid email or password') {
    super(message)
    this.name = 'InvalidCredentialsError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class TotpRequiredError extends Error {
  constructor(message = 'two-factor code required') {
    super(message)
    this.name = 'TotpRequiredError'
  }
}

export class InvalidTotpError extends Error {
  constructor(message = 'invalid two-factor code') {
    super(message)
    this.name = 'InvalidTotpError'
  }
}

export class ThrottledError extends Error {
  constructor(message = 'too many attempts, try again later') {
    super(message)
    this.name = 'ThrottledError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$gVt68qDawv/zUU+d8GpHaQ$4DKAd5n3hLEXTAII+FlEfhGIdN2dCKFfaCOW+ODIe0A'

export interface AuthServiceDeps {
  repository: UsersRepository
  hasher: PasswordHasher
  tokens: TokenService
  totp: TotpService
  throttler: LoginThrottler
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
  return new DefaultAuthService(deps)
}

class DefaultAuthService implements AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const email = input.email?.trim().toLowerCase()
    if (!email || typeof input.password !== 'string' || !input.password) {
      throw new InvalidCredentialsError()
    }
    if (this.deps.throttler.isBlocked(email)) {
      throw new ThrottledError()
    }
    const user = await this.deps.repository.findByEmail(email)
    if (!user) {
      await this.deps.hasher.verify(input.password, DUMMY_PASSWORD_HASH)
      this.deps.throttler.recordFailure(email)
      throw new InvalidCredentialsError()
    }
    const passwordOk = await this.deps.hasher.verify(input.password, user.passwordHash)
    if (!passwordOk) {
      this.deps.throttler.recordFailure(email)
      throw new InvalidCredentialsError()
    }
    if (user.is2faEnabled) {
      if (!input.totpCode) {
        throw new TotpRequiredError()
      }
      if (!this.deps.totp.verify(user.totpSecret ?? '', input.totpCode)) {
        this.deps.throttler.recordFailure(email)
        throw new InvalidCredentialsError()
      }
    }
    this.deps.throttler.clear(email)
    return this.issueSession(user)
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
    const user = await this.findByRefreshToken(refreshToken)
    return this.issueSession(user)
  }

  async logout(refreshToken: string): Promise<void> {
    const user = await this.findByRefreshToken(refreshToken)
    user.refreshTokenHash = null
    await this.deps.repository.update(user)
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    return this.toPublicUser(await this.mustFind(userId))
  }

  async setupTotp(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.mustFind(userId)
    const secret = this.deps.totp.generateSecret()
    user.totpSecret = secret
    user.is2faEnabled = false
    await this.deps.repository.update(user)
    return { secret, otpauthUrl: this.deps.totp.generateUri(secret, user.email) }
  }

  async enableTotp(userId: string, code: string): Promise<PublicUser> {
    const user = await this.mustFind(userId)
    if (!code || !user.totpSecret || !this.deps.totp.verify(user.totpSecret, code)) {
      throw new InvalidTotpError()
    }
    user.is2faEnabled = true
    await this.deps.repository.update(user)
    return this.toPublicUser(user)
  }

  async disableTotp(userId: string, code: string): Promise<PublicUser> {
    const user = await this.mustFind(userId)
    if (!code || !user.totpSecret || !this.deps.totp.verify(user.totpSecret, code)) {
      throw new InvalidTotpError()
    }
    user.totpSecret = null
    user.is2faEnabled = false
    await this.deps.repository.update(user)
    return this.toPublicUser(user)
  }

  async createApiKey(
    userId: string,
    name: string,
  ): Promise<{ id: string; name: string; key: string }> {
    const user = await this.mustFind(userId)
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new ValidationError('name is required')
    }
    const key = `np_${randomBytes(32).toString('base64url')}`
    const apiKey = {
      id: randomUUID(),
      name: name.trim(),
      hash: DefaultAuthService.sha256(key),
      createdAt: new Date(),
    }
    user.apiKeys = [...user.apiKeys, apiKey]
    await this.deps.repository.update(user)
    return { id: apiKey.id, name: apiKey.name, key }
  }

  async listApiKeys(userId: string): Promise<ApiKeySummary[]> {
    const user = await this.mustFind(userId)
    return user.apiKeys.map(({ id, name, createdAt }) => ({ id, name, createdAt }))
  }

  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const user = await this.mustFind(userId)
    const remaining = user.apiKeys.filter((k) => k.id !== keyId)
    if (remaining.length === user.apiKeys.length) {
      throw new NotFoundError(`api key not found: ${keyId}`)
    }
    user.apiKeys = remaining
    await this.deps.repository.update(user)
  }

  async resolveApiKey(key: string): Promise<PublicUser | null> {
    const hash = DefaultAuthService.sha256(key)
    const users = await this.deps.repository.findAll()
    const user = users.find((u) => u.apiKeys.some((k) => k.hash === hash))
    return user ? this.toPublicUser(user) : null
  }

  private async issueSession(user: User): Promise<LoginResult> {
    const { accessToken, refreshToken } = this.deps.tokens.issue(user)
    user.refreshTokenHash = DefaultAuthService.sha256(refreshToken)
    await this.deps.repository.update(user)
    return {
      accessToken,
      refreshToken,
      user: this.toPublicUser(user),
    }
  }

  private async findByRefreshToken(refreshToken: string): Promise<User> {
    let payload
    try {
      payload = this.deps.tokens.verifyRefresh(refreshToken)
    } catch {
      throw new UnauthorizedError()
    }
    const user = await this.deps.repository.findById(payload.sub)
    const expectedHash = DefaultAuthService.sha256(refreshToken)
    if (!user || user.refreshTokenHash !== expectedHash) {
      throw new UnauthorizedError()
    }
    return user
  }

  private async mustFind(userId: string): Promise<User> {
    const user = await this.deps.repository.findById(userId)
    if (!user) {
      throw new NotFoundError(`user not found: ${userId}`)
    }
    return user
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      is2faEnabled: user.is2faEnabled,
      createdAt: user.createdAt,
    }
  }

  private static sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }
}
