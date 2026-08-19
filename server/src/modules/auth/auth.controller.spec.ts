import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { authenticator } from 'otplib'
import { AuthModule } from './auth.module'
import { USERS_REPOSITORY, type UsersRepository } from './users.repository'
import { Argon2PasswordHasher } from './password.service'
import type { User } from './user'

async function seedUser(repository: UsersRepository, overrides: Partial<User> = {}): Promise<User> {
  const hasher = new Argon2PasswordHasher()
  const user: User = {
    id: 'user-1',
    email: 'admin@nutty.panel',
    role: 'admin',
    passwordHash: await hasher.hash('s3cret-password'),
    is2faEnabled: false,
    totpSecret: null,
    refreshTokenHash: null,
    apiKeys: [],
    createdAt: new Date(),
    ...overrides,
  }
  return repository.create(user)
}

describe('AuthController (HTTP)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  async function loginAs(email = 'admin@nutty.panel') {
    const repo = app.get<UsersRepository>(USERS_REPOSITORY)
    const user = await seedUser(repo, { email })
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 's3cret-password' })
      .expect(200)
    return { user, accessToken: res.body.accessToken, refreshToken: res.body.refreshToken }
  }

  it('logs in and reads the current user', async () => {
    const { accessToken, refreshToken } = await loginAs()

    expect(refreshToken).toBeTruthy()

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(me.body).toEqual({
      id: 'user-1',
      email: 'admin@nutty.panel',
      role: 'admin',
      is2faEnabled: false,
      createdAt: expect.any(String),
    })
  })

  it('rejects login with a wrong password with HTTP 401', async () => {
    const repo = app.get<UsersRepository>(USERS_REPOSITORY)
    await seedUser(repo)

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@nutty.panel', password: 'wrong' })
      .expect(401)
  })

  it('rejects a malformed login body with HTTP 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ password: 's3cret-password' })
      .expect(401)
  })

  it('rejects an unauthenticated /me with HTTP 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401)
  })

  it('rejects a garbage bearer token with HTTP 401', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer garbage')
      .expect(401)
  })

  it('accepts a valid x-api-key on protected endpoints', async () => {
    const repo = app.get<UsersRepository>(USERS_REPOSITORY)
    const user = await seedUser(repo)

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 's3cret-password' })
      .expect(200)

    const keyRes = await request(app.getHttpServer())
      .post('/api/auth/api-keys')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'ci' })
      .expect(201)

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('x-api-key', keyRes.body.key)
      .expect(200)

    expect(me.body.email).toBe('admin@nutty.panel')
  })

  it('enforces roles with HTTP 403 for a regular user', async () => {
    const repo = app.get<UsersRepository>(USERS_REPOSITORY)
    const user = await seedUser(repo, { role: 'user', id: 'user-2' })

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 's3cret-password' })
      .expect(200)

    await request(app.getHttpServer())
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403)
  })

  it('allows an admin through the roles guard', async () => {
    const { accessToken } = await loginAs()

    await request(app.getHttpServer())
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
  })

  it('refreshes a session and rotates the refresh token', async () => {
    const { refreshToken } = await loginAs()

    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200)

    expect(res.body.accessToken).toBeTruthy()
    expect(res.body.refreshToken).not.toBe(refreshToken)
  })

  it('rejects a reused refresh token with HTTP 401', async () => {
    const { refreshToken } = await loginAs()
    await request(app.getHttpServer()).post('/api/auth/refresh').send({ refreshToken }).expect(200)

    await request(app.getHttpServer()).post('/api/auth/refresh').send({ refreshToken }).expect(401)
  })

  it('logs out and revokes the refresh token', async () => {
    const { refreshToken } = await loginAs()

    await request(app.getHttpServer()).post('/api/auth/logout').send({ refreshToken }).expect(200)

    await request(app.getHttpServer()).post('/api/auth/refresh').send({ refreshToken }).expect(401)
  })

  it('enables 2FA and then requires a code at login', async () => {
    const { accessToken } = await loginAs()

    const setup = await request(app.getHttpServer())
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201)

    const code = authenticator.generate(setup.body.secret)
    await request(app.getHttpServer())
      .post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code })
      .expect(201)

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@nutty.panel', password: 's3cret-password' })
      .expect(401)

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@nutty.panel',
        password: 's3cret-password',
        totpCode: authenticator.generate(setup.body.secret),
      })
      .expect(200)

    expect(login.body.user.is2faEnabled).toBe(true)
  })

  it('throttles repeated failed logins with HTTP 429', async () => {
    const repo = app.get<UsersRepository>(USERS_REPOSITORY)
    await seedUser(repo)

    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@nutty.panel', password: 'wrong' })
        .expect(401)
    }

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@nutty.panel', password: 's3cret-password' })
      .expect(429)
  })

  it('creates, lists and revokes api keys', async () => {
    const { accessToken } = await loginAs()

    const created = await request(app.getHttpServer())
      .post('/api/auth/api-keys')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'deploy' })
      .expect(201)
    expect(created.body.key).toMatch(/^np_/)

    const list = await request(app.getHttpServer())
      .get('/api/auth/api-keys')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(list.body).toHaveLength(1)
    expect(list.body[0].key).toBeUndefined()

    await request(app.getHttpServer())
      .delete(`/api/auth/api-keys/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204)

    const after = await request(app.getHttpServer())
      .get('/api/auth/api-keys')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(after.body).toHaveLength(0)
  })
})
