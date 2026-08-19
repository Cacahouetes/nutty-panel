import type { User } from './user'
import type { UsersRepository } from './users.repository'

export class InMemoryUsersRepository implements UsersRepository {
  private readonly users = new Map<string, User>()
  private readonly byEmail = new Map<string, string>()

  async create(user: User): Promise<User> {
    this.users.set(user.id, user)
    this.byEmail.set(user.email.toLowerCase(), user.id)
    return user
  }

  async findAll(): Promise<User[]> {
    return [...this.users.values()]
  }

  async findByEmail(email: string): Promise<User | null> {
    const id = this.byEmail.get(email.toLowerCase())
    return id ? (this.users.get(id) ?? null) : null
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null
  }

  async update(user: User): Promise<User> {
    this.users.set(user.id, user)
    if (this.byEmail.get(user.email.toLowerCase()) !== user.id) {
      this.byEmail.set(user.email.toLowerCase(), user.id)
    }
    return user
  }
}
