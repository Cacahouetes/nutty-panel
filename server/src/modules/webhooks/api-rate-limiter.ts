import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common'
import type { AuthenticatedUser } from '../auth/user'

export const API_RATE_LIMIT_OPTIONS = Symbol('ApiRateLimitOptions')

export interface ApiRateLimitOptions {
  limit: number
  windowMs: number
  clock?: () => number
}

interface WindowState {
  count: number
  windowStart: number
}

@Injectable()
export class ApiRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, WindowState>()
  private readonly limit: number
  private readonly windowMs: number
  private readonly clock: () => number

  constructor(@Inject(API_RATE_LIMIT_OPTIONS) options: ApiRateLimitOptions) {
    this.limit = options.limit
    this.windowMs = options.windowMs
    this.clock = options.clock ?? Date.now
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser
      ip?: string
    }>()
    const key = request.user?.id ?? request.ip ?? 'anonymous'
    const now = this.clock()
    const state = this.hits.get(key)
    if (!state || now - state.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now })
      return true
    }
    state.count += 1
    if (state.count > this.limit) {
      throw new ForbiddenException('rate limit exceeded')
    }
    return true
  }
}
