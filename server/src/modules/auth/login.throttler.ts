export class LoginThrottler {
  private readonly attempts = new Map<string, number[]>()

  constructor(
    private readonly maxAttempts = 5,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  isBlocked(key: string): boolean {
    const now = Date.now()
    const recent = (this.attempts.get(key) ?? []).filter((t) => now - t < this.windowMs)
    this.attempts.set(key, recent)
    return recent.length >= this.maxAttempts
  }

  recordFailure(key: string): void {
    const list = this.attempts.get(key) ?? []
    list.push(Date.now())
    this.attempts.set(key, list)
  }

  clear(key: string): void {
    this.attempts.delete(key)
  }
}
