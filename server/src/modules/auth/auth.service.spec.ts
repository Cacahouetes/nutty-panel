import { describe, it, expect } from '@jest/globals'
import { randomUUID } from 'node:crypto'
import * as argon2 from 'argon2'
import { JwtService } from '@nestjs/jwt'
import { authenticator } from 'otplib'
import {
  InvalidCredentialsError,
  InvalidTotpError,
  NotFoundError,
  ThrottledError,
  TotpRequiredError,
  UnauthorizedError,
  createAuthService,
  type AuthService,
} from './auth.service'
import { InMemoryUsersRepository } from './in-memory.users.repository'
import { Argon2PasswordHasher } from './password.service'
import { JwtTokenService } from './token.service'
import { OtplibTotpService } from './totp.service'
import { LoginThrottler } from './login.throttler'
import type { User } from './user'

const TEST_PASSWORD = 'correct-horse-battery-staple'

async function seedUser(
  repository: InMemoryUsersRepository,
  overrides: Partial<User> = {},
): Promise<User> {
  const user: User = {
    id: randomUUID(),
    email: 'admin@nutty.panel',
    passwordHash: await argon2.hash(TEST_PASSWORD),
    role: 'admin',
    totpSecret: null,
    is2faEnabled: false,
    refreshTokenHash: null,
    apiKeys: [],
    createdAt: new Date(),
    ...overrides,
  }
  await repository.create(user)
  return user
}

function buildAuth(): {
  service: AuthService
  repository: InMemoryUsersRepository
} {
  const repository = new InMemoryUsersRepository()
  const service = createAuthService({
    repository,
    hasher: new Argon2PasswordHasher(),
    tokens: new JwtTokenService(new JwtService({ secret: 'test-secret' })),
    totp: new OtplibTotpService(),
    throttler: new LoginThrottler(5, 15 * 60 * 1000),
  })
  return { service, repository }
}

async function loginUser(service: AuthService): Promise<string> {
  const result = await service.login({
    email: 'admin@nutty.panel',
    password: TEST_PASSWORD,
  })
  return result.refreshToken
}

describe('AuthService', () => {
  describe('login', () => {
    it('returns access and refresh tokens plus the public user', async () => {
      const { service, repository } = buildAuth()
      await seedUser(repository)

      const result = await service.login({
        email: 'admin@nutty.panel',
        password: TEST_PASSWORD,
      })

      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      expect(result.user).toEqual({
        id: expect.any(String),
        email: 'admin@nutty.panel',
        role: 'admin',
        is2faEnabled: false,
        createdAt: expect.any(Date),
      })
    })

    it('is case-insensitive on email', async () => {
      const { service, repository } = buildAuth()
      await seedUser(repository)

      const result = await service.login({
        email: 'Admin@Nutty.Panel',
        password: TEST_PASSWORD,
      })

      expect(result.user.email).toBe('admin@nutty.panel')
    })

    it('rejects a wrong password with InvalidCredentialsError', async () => {
      const { service, repository } = buildAuth()
      await seedUser(repository)

      await expect(
        service.login({ email: 'admin@nutty.panel', password: 'wrong' }),
      ).rejects.toThrow(InvalidCredentialsError)
    })

    it('rejects an unknown email with InvalidCredentialsError', async () => {
      const { service } = buildAuth()

      await expect(
        service.login({ email: 'ghost@nutty.panel', password: TEST_PASSWORD }),
      ).rejects.toThrow(InvalidCredentialsError)
    })

    it('requires a totp code when 2FA is enabled', async () => {
      const { service, repository } = buildAuth()
      await seedUser(repository, {
        totpSecret: authenticator.generateSecret(),
        is2faEnabled: true,
      })

      await expect(
        service.login({ email: 'admin@nutty.panel', password: TEST_PASSWORD }),
      ).rejects.toThrow(TotpRequiredError)
    })

    it('accepts a valid totp code when 2FA is enabled', async () => {
      const { service, repository } = buildAuth()
      const secret = authenticator.generateSecret()
      await seedUser(repository, { totpSecret: secret, is2faEnabled: true })

      const result = await service.login({
        email: 'admin@nutty.panel',
        password: TEST_PASSWORD,
        totpCode: authenticator.generate(secret),
      })

      expect(result.accessToken).toBeTruthy()
    })

    it('rejects a wrong totp code', async () => {
      const { service, repository } = buildAuth()
      const secret = authenticator.generateSecret()
      await seedUser(repository, { totpSecret: secret, is2faEnabled: true })

      await expect(
        service.login({
          email: 'admin@nutty.panel',
          password: TEST_PASSWORD,
          totpCode: '000000',
        }),
      ).rejects.toThrow(InvalidCredentialsError)
    })

    it('throttles after 5 failed attempts', async () => {
      const { service, repository } = buildAuth()
      await seedUser(repository)

      for (let i = 0; i < 5; i++) {
        await expect(
          service.login({ email: 'admin@nutty.panel', password: 'wrong' }),
        ).rejects.toThrow(InvalidCredentialsError)
      }

      await expect(
        service.login({ email: 'admin@nutty.panel', password: 'wrong' }),
      ).rejects.toThrow(ThrottledError)
    })

    it('clears the throttle after a successful login', async () => {
      const { service, repository } = buildAuth()
      await seedUser(repository)

      for (let i = 0; i < 4; i++) {
        await expect(
          service.login({ email: 'admin@nutty.panel', password: 'wrong' }),
        ).rejects.toThrow(InvalidCredentialsError)
      }
      await service.login({ email: 'admin@nutty.panel', password: TEST_PASSWORD })
      await expect(
        service.login({ email: 'admin@nutty.panel', password: 'wrong' }),
      ).rejects.toThrow(InvalidCredentialsError)
    })
  })

  describe('refresh', () => {
    it('issues a new token pair and invalidates the old refresh token', async () => {
      const { service, repository } = buildAuth()
      await seedUser(repository)
      const oldRefresh = await loginUser(service)

      const result = await service.refresh(oldRefresh)

      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).not.toBe(oldRefresh)

      await expect(service.refresh(oldRefresh)).rejects.toThrow(UnauthorizedError)
    })

    it('rejects a garbage refresh token', async () => {
      const { service } = buildAuth()

      await expect(service.refresh('not.a.jwt')).rejects.toThrow(UnauthorizedError)
    })

    it('rejects an access token used as a refresh token', async () => {
      const { service, repository } = buildAuth()
      await seedUser(repository)
      const login = await service.login({
        email: 'admin@nutty.panel',
        password: TEST_PASSWORD,
      })

      await expect(service.refresh(login.accessToken)).rejects.toThrow(UnauthorizedError)
    })
  })

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      const { service, repository } = buildAuth()
      await seedUser(repository)
      const refreshToken = await loginUser(service)

      await service.logout(refreshToken)

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedError)
    })

    it('rejects logout with an invalid token', async () => {
      const { service } = buildAuth()

      await expect(service.logout('garbage')).rejects.toThrow(UnauthorizedError)
    })
  })

  describe('getCurrentUser', () => {
    it('returns the public user for an existing id', async () => {
      const { service, repository } = buildAuth()
      const user = await seedUser(repository)

      const me = await service.getCurrentUser(user.id)

      expect(me.id).toBe(user.id)
      expect(me.email).toBe(user.email)
      expect(me).not.toHaveProperty('passwordHash')
    })

    it('throws NotFoundError for an unknown user', async () => {
      const { service } = buildAuth()

      await expect(service.getCurrentUser('missing')).rejects.toThrow(NotFoundError)
    })
  })

  describe('2FA setup', () => {
    it('generates a secret and otpauth url', async () => {
      const { service, repository } = buildAuth()
      const user = await seedUser(repository)

      const setup = await service.setupTotp(user.id)

      expect(setup.secret).toMatch(/^[A-Z2-7]{16,32}$/)
      expect(setup.otpauthUrl).toContain('otpauth://totp/')
      expect(setup.otpauthUrl).toContain('Nutty%20Panel')
    })

    it('enables 2FA after verifying a code', async () => {
      const { service, repository } = buildAuth()
      const user = await seedUser(repository)
      const setup = await service.setupTotp(user.id)

      const updated = await service.enableTotp(user.id, authenticator.generate(setup.secret))

      expect(updated.is2faEnabled).toBe(true)
    })

    it('rejects an invalid code when enabling 2FA', async () => {
      const { service, repository } = buildAuth()
      const user = await seedUser(repository)
      await service.setupTotp(user.id)

      await expect(service.enableTotp(user.id, '000000')).rejects.toThrow(InvalidTotpError)
    })

    it('disables 2FA after verifying a code', async () => {
      const { service, repository } = buildAuth()
      const secret = authenticator.generateSecret()
      const user = await seedUser(repository, {
        totpSecret: secret,
        is2faEnabled: true,
      })

      const updated = await service.disableTotp(user.id, authenticator.generate(secret))

      expect(updated.is2faEnabled).toBe(false)
      const stored = await repository.findById(user.id)
      expect(stored?.totpSecret).toBeNull()
    })
  })

  describe('api keys', () => {
    it('creates a key and returns the plaintext once', async () => {
      const { service, repository } = buildAuth()
      const user = await seedUser(repository)

      const created = await service.createApiKey(user.id, 'ci')

      expect(created.key).toMatch(/^np_/)
      const stored = await repository.findById(user.id)
      expect(stored?.apiKeys[0]?.hash).not.toBe(created.key)
      expect(stored?.apiKeys[0]?.hash).toBeTruthy()
    })

    it('lists keys without exposing their hash', async () => {
      const { service, repository } = buildAuth()
      const user = await seedUser(repository)
      await service.createApiKey(user.id, 'ci')

      const keys = await service.listApiKeys(user.id)

      expect(keys).toHaveLength(1)
      expect(keys[0]).toHaveProperty('name', 'ci')
      expect(keys[0]).not.toHaveProperty('hash')
    })

    it('revokes a key and rejects a second revoke', async () => {
      const { service, repository } = buildAuth()
      const user = await seedUser(repository)
      const created = await service.createApiKey(user.id, 'ci')

      await service.revokeApiKey(user.id, created.id)

      await expect(service.revokeApiKey(user.id, created.id)).rejects.toThrow(NotFoundError)
    })

    it('resolves a user from a valid api key', async () => {
      const { service, repository } = buildAuth()
      const user = await seedUser(repository)
      const created = await service.createApiKey(user.id, 'ci')

      const resolved = await service.resolveApiKey(created.key)

      expect(resolved?.id).toBe(user.id)
    })

    it('returns null for an invalid api key', async () => {
      const { service } = buildAuth()

      const resolved = await service.resolveApiKey('np_invalid')

      expect(resolved).toBeNull()
    })
  })
})
