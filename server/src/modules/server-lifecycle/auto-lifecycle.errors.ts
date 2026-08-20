export class AutoLifecycleNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AutoLifecycleNotFoundError'
  }
}

export class AutoLifecycleValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AutoLifecycleValidationError'
  }
}
