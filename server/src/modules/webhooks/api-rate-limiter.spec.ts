import { describe, it, expect } from '@jest/globals'
import { ForbiddenException } from '@nestjs/common'
import { ApiRateLimitGuard } from './api-rate-limiter'

function buildContext(userId?: string) {
  const request = {
    user: userId ? { id: userId, email: 'a@b.c', role: 'admin' as const } : undefined,
  }
  return {
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    },
    request,
  }
}

describe('ApiRateLimitGuard', () => {
  it('allows requests up to the configured limit', () => {
    const now = 1000
    const guard = new ApiRateLimitGuard({ limit: 2, windowMs: 60_000, clock: () => now })
    const { context } = buildContext('user-1')

    expect(guard.canActivate(context as never)).toBe(true)
    expect(guard.canActivate(context as never)).toBe(true)
  })

  it('rejects requests above the limit with ForbiddenException', () => {
    const now = 1000
    const guard = new ApiRateLimitGuard({ limit: 2, windowMs: 60_000, clock: () => now })
    const { context } = buildContext('user-1')

    guard.canActivate(context as never)
    guard.canActivate(context as never)

    expect(() => guard.canActivate(context as never)).toThrow(ForbiddenException)
  })

  it('resets the counter after the window elapses', () => {
    let now = 1000
    const guard = new ApiRateLimitGuard({ limit: 2, windowMs: 60_000, clock: () => now })
    const { context } = buildContext('user-1')

    guard.canActivate(context as never)
    guard.canActivate(context as never)
    expect(() => guard.canActivate(context as never)).toThrow(ForbiddenException)

    now = 1000 + 60_000
    expect(guard.canActivate(context as never)).toBe(true)
  })

  it('tracks authenticated users separately from anonymous requests', () => {
    const now = 1000
    const guard = new ApiRateLimitGuard({ limit: 1, windowMs: 60_000, clock: () => now })
    const userA = buildContext('user-1')
    const userB = buildContext('user-2')

    expect(guard.canActivate(userA.context as never)).toBe(true)
    expect(() => guard.canActivate(userA.context as never)).toThrow(ForbiddenException)
    expect(guard.canActivate(userB.context as never)).toBe(true)
  })
})
