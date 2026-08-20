import { describe, it, expect } from '@jest/globals'
import { InMemoryEventBus, type EventHandler } from './event-bus'
import type { AppEvent } from './event'

describe('InMemoryEventBus', () => {
  const started: AppEvent = {
    type: 'server.started',
    occurredAt: new Date('2026-01-01T00:00:00Z'),
    data: { serverId: 'srv-1', name: 'Lobby' },
  }

  it('delivers emitted events to subscribed handlers', () => {
    const bus = new InMemoryEventBus()
    const received: AppEvent[] = []
    bus.subscribe((event) => {
      received.push(event)
    })
    bus.emit(started)
    expect(received).toEqual([started])
  })

  it('stops delivering after unsubscribe', () => {
    const bus = new InMemoryEventBus()
    const received: AppEvent[] = []
    const unsubscribe = bus.subscribe((event) => {
      received.push(event)
    })
    unsubscribe()
    bus.emit(started)
    expect(received).toEqual([])
  })

  it('delivers to every subscribed handler', () => {
    const bus = new InMemoryEventBus()
    const handlerA: EventHandler = () => {}
    const handlerB: EventHandler = () => {}
    const a = jest.fn(handlerA)
    const b = jest.fn(handlerB)
    bus.subscribe(a)
    bus.subscribe(b)
    bus.emit(started)
    expect(a).toHaveBeenCalledWith(started)
    expect(b).toHaveBeenCalledWith(started)
  })

  it('keeps delivering to other handlers when one throws', () => {
    const bus = new InMemoryEventBus()
    const received: AppEvent[] = []
    bus.subscribe(() => {
      throw new Error('boom')
    })
    bus.subscribe((event) => {
      received.push(event)
    })
    expect(() => bus.emit(started)).not.toThrow()
    expect(received).toEqual([started])
  })

  it('does not throw when an async handler rejects', () => {
    const bus = new InMemoryEventBus()
    bus.subscribe(async () => {
      throw new Error('async boom')
    })
    expect(() => bus.emit(started)).not.toThrow()
  })
})
