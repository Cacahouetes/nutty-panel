import { describe, it, expect, beforeEach } from '@jest/globals'
import type { PasswordHasher } from './password.service'
import type { User } from './user'
import { InMemoryUsersRepository } from './in-memory.users.repository'
import {
  createAdminBootstrap,
  type AdminBootstrap,
  type AdminBootstrapConfig,
} from './admin-bootstrap'

class FakePasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed:${password}`
  }

  async verify(_password: string, hash: string): Promise<boolean> {
    return hash.startsWith('hashed:')
  }
}

describe('AdminBootstrap', () => {
  let repository: InMemoryUsersRepository
  let hasher: FakePasswordHasher

  function build(config: Partial<AdminBootstrapConfig> = {}): AdminBootstrap {
    return createAdminBootstrap({
      repository,
      hasher,
      config: {
        adminEmail: 'admin@nutty.panel',
        ...config,
      },
    })
  }

  beforeEach(() => {
    repository = new InMemoryUsersRepository()
    hasher = new FakePasswordHasher()
  })

  it('does nothing when no admin password is configured', async () => {
    await build({ adminPassword: undefined }).ensureAdmin()
    await build({ adminPassword: '' }).ensureAdmin()

    expect(await repository.findAll()).toEqual([])
  })

  it('creates an admin on an empty repository', async () => {
    await build({ adminPassword: 's3cret' }).ensureAdmin()

    const users = await repository.findAll()
    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({
      email: 'admin@nutty.panel',
      passwordHash: 'hashed:s3cret',
      role: 'admin',
      is2faEnabled: false,
    })
  })

  it('normalizes the admin email', async () => {
    await build({
      adminEmail: '  Admin@Nutty.Panel ',
      adminPassword: 's3cret',
    }).ensureAdmin()

    const user = await repository.findByEmail('admin@nutty.panel')
    expect(user?.email).toBe('admin@nutty.panel')
  })

  it('does not touch a repository that already has users', async () => {
    await repository.create({
      id: 'u1',
      email: 'owner@example.com',
      passwordHash: 'x',
      role: 'user',
      totpSecret: null,
      is2faEnabled: false,
      refreshTokenHash: null,
      apiKeys: [],
      createdAt: new Date(),
    })

    await build({ adminPassword: 's3cret' }).ensureAdmin()

    const users = await repository.findAll()
    expect(users).toHaveLength(1)
    expect(users[0].email).toBe('owner@example.com')
  })

  it('does not create a duplicate when the admin email already exists', async () => {
    const user: User = {
      id: 'u1',
      email: 'admin@nutty.panel',
      passwordHash: 'existing',
      role: 'admin',
      totpSecret: null,
      is2faEnabled: false,
      refreshTokenHash: null,
      apiKeys: [],
      createdAt: new Date(),
    }
    await repository.create(user)

    await build({ adminPassword: 's3cret' }).ensureAdmin()

    expect(await repository.findAll()).toHaveLength(1)
    expect((await repository.findAll())[0].passwordHash).toBe('existing')
  })
})
