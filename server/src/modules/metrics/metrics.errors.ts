export class MetricsNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MetricsNotFoundError'
  }
}

export class MetricsUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MetricsUnavailableError'
  }
}
