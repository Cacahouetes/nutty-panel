import { randomUUID } from 'node:crypto'
import type { PasswordHasher } from './password.service'
import type { User } from './user'
import type { UsersRepository } from './users.repository'

export interface AdminBootstrapConfig {
  adminEmail: string
  adminPassword?: string
}

export interface AdminBootstrap {
  ensureAdmin(): Promise<void>
}

export const ADMIN_BOOTSTRAP = Symbol('AdminBootstrap')

export interface AdminBootstrapDeps {
  repository: UsersRepository
  hasher: PasswordHasher
  config: AdminBootstrapConfig
}

export function createAdminBootstrap(deps: AdminBootstrapDeps): AdminBootstrap {
  return new DefaultAdminBootstrap(deps)
}

class DefaultAdminBootstrap implements AdminBootstrap {
  constructor(private readonly deps: AdminBootstrapDeps) {}

  async ensureAdmin(): Promise<void> {
    const { adminPassword, adminEmail } = this.deps.config
    if (!adminPassword || !adminPassword.trim()) {
      return
    }
    const users = await this.deps.repository.findAll()
    if (users.length > 0) {
      return
    }
    const existing = await this.deps.repository.findByEmail(adminEmail)
    if (existing) {
      return
    }
    const user: User = {
      id: randomUUID(),
      email: adminEmail.trim().toLowerCase(),
      passwordHash: await this.deps.hasher.hash(adminPassword),
      role: 'admin',
      totpSecret: null,
      is2faEnabled: false,
      refreshTokenHash: null,
      apiKeys: [],
      createdAt: new Date(),
    }
    await this.deps.repository.create(user)
  }
}
