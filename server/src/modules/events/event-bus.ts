import type { AppEvent } from './event'

export type EventHandler = (event: AppEvent) => void | Promise<void>

export interface EventBus {
  emit(event: AppEvent): void
  subscribe(handler: EventHandler): () => void
}

export const EVENT_BUS = Symbol('EventBus')

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Set<EventHandler>()

  emit(event: AppEvent): void {
    for (const handler of [...this.handlers]) {
      try {
        const result = handler(event)
        if (result && typeof result.catch === 'function') {
          result.catch(() => {})
        }
      } catch {
        // a failing handler must not break delivery to the others
      }
    }
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }
}
