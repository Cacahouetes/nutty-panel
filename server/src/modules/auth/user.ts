export type UserRole = 'admin' | 'moderator' | 'user'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
}

export interface ApiKey {
  id: string
  name: string
  hash: string
  createdAt: Date
}

export interface User {
  id: string
  email: string
  passwordHash: string
  role: UserRole
  totpSecret: string | null
  is2faEnabled: boolean
  refreshTokenHash: string | null
  apiKeys: ApiKey[]
  createdAt: Date
}

const ROLE_WEIGHT: Record<UserRole, number> = {
  user: 1,
  moderator: 2,
  admin: 3,
}

export function roleAtLeast(role: UserRole, required: UserRole): boolean {
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[required]
}
