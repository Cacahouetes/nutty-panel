import type { User } from './user'

export interface UsersRepository {
  create(user: User): Promise<User>
  findAll(): Promise<User[]>
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  update(user: User): Promise<User>
}

export const USERS_REPOSITORY = Symbol('UsersRepository')
