import { describe, it, expect } from '@jest/globals'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  createServersService,
  type ServersService,
} from './servers.service'
import type { EventBus } from '../events/event-bus'
import type { AppEvent } from '../events/event'
import { InMemoryServersRepository } from './in-memory.servers.repository'
import type { ServerInstance, ServerType } from './server-instance'
import type { MinecraftVersionProvider } from './minecraft-version.provider'
import type { ServerProcessManager } from './server-process.manager'

class StubVersionProvider implements MinecraftVersionProvider {
  private readonly versions = new Set(['1.20.4', '1.20.1', '1.21', 'paper-1.20.4'])

  async isVersionSupported(type: string, version: string): Promise<boolean> {
    return this.versions.has(`${type}-${version}`) || this.versions.has(version)
  }
}

class StubProcessManager implements ServerProcessManager {
  starts = 0
  stops = 0
  kills = 0

  async start(): Promise<void> {
    this.starts++
  }

  async stop(): Promise<void> {
    this.stops++
  }

  async kill(): Promise<void> {
    this.kills++
  }
}

function buildService(): {
  service: ServersService
  processes: StubProcessManager
} {
  const repository = new InMemoryServersRepository()
  const versions = new StubVersionProvider()
  const processes = new StubProcessManager()
  const service = createServersService({ repository, versions, processes })
  return { service, processes }
}

class RecordingEventBus implements EventBus {
  readonly emitted: AppEvent[] = []

  emit(event: AppEvent): void {
    this.emitted.push(event)
  }

  subscribe(): () => void {
    return () => {}
  }
}

function buildServiceWithEvents(): {
  service: ServersService
  events: RecordingEventBus
} {
  const repository = new InMemoryServersRepository()
  const versions = new StubVersionProvider()
  const processes = new StubProcessManager()
  const events = new RecordingEventBus()
  const service = createServersService({ repository, versions, processes, events })
  return { service, events }
}

function validInput() {
  return {
    name: 'Survival',
    type: 'vanilla' as const,
    version: '1.20.4',
    port: 25565,
  }
}

async function createInstance(service: ServersService): Promise<ServerInstance> {
  return service.create(validInput())
}

describe('ServersService', () => {
  describe('create', () => {
    it('creates a server instance with default resource limits', async () => {
      const { service } = buildService()

      const instance = await service.create(validInput())

      expect(instance.name).toBe('Survival')
      expect(instance.type).toBe('vanilla')
      expect(instance.version).toBe('1.20.4')
      expect(instance.port).toBe(25565)
      expect(instance.memoryMb).toBe(2048)
      expect(instance.cpuPercent).toBe(100)
      expect(instance.status).toBe('stopped')
      expect(instance.id).toBeTruthy()
    })

    it('rejects an unknown server type', async () => {
      const { service } = buildService()

      await expect(
        service.create({ ...validInput(), type: 'garbage' as unknown as ServerType }),
      ).rejects.toThrow(ValidationError)
    })

    it('rejects an unsupported version', async () => {
      const { service } = buildService()

      await expect(service.create({ ...validInput(), version: '9.9.9' })).rejects.toThrow(
        ValidationError,
      )
    })

    it('rejects a port outside the allowed range', async () => {
      const { service } = buildService()

      await expect(service.create({ ...validInput(), port: 999 })).rejects.toThrow(ValidationError)
    })

    it('rejects a duplicate port', async () => {
      const { service } = buildService()
      await createInstance(service)

      await expect(
        service.create({ ...validInput(), name: 'Second', port: 25565 }),
      ).rejects.toThrow(ConflictError)
    })

    it('rejects an empty name', async () => {
      const { service } = buildService()

      await expect(service.create({ ...validInput(), name: '' })).rejects.toThrow(ValidationError)
    })

    it('rejects memory below the minimum', async () => {
      const { service } = buildService()

      await expect(service.create({ ...validInput(), memoryMb: 64 })).rejects.toThrow(
        ValidationError,
      )
    })

    it('rejects a cpu percentage outside 1-100', async () => {
      const { service } = buildService()

      await expect(service.create({ ...validInput(), cpuPercent: 0 })).rejects.toThrow(
        ValidationError,
      )
      await expect(service.create({ ...validInput(), cpuPercent: 150 })).rejects.toThrow(
        ValidationError,
      )
    })
  })

  describe('findAll / findOne', () => {
    it('lists created instances', async () => {
      const { service } = buildService()
      await createInstance(service)
      await service.create({ ...validInput(), name: 'Creative', port: 25566 })

      const all = await service.findAll()

      expect(all).toHaveLength(2)
    })

    it('returns an instance by id', async () => {
      const { service } = buildService()
      const created = await createInstance(service)

      const found = await service.findOne(created.id)

      expect(found.id).toBe(created.id)
    })

    it('throws NotFoundError for a missing instance', async () => {
      const { service } = buildService()

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundError)
    })
  })

  describe('update', () => {
    it('updates name and resource limits', async () => {
      const { service } = buildService()
      const created = await createInstance(service)

      const updated = await service.update(created.id, {
        name: 'Renamed',
        memoryMb: 4096,
        cpuPercent: 50,
      })

      expect(updated.name).toBe('Renamed')
      expect(updated.memoryMb).toBe(4096)
      expect(updated.cpuPercent).toBe(50)
    })

    it('throws NotFoundError for a missing instance', async () => {
      const { service } = buildService()

      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('remove', () => {
    it('removes an instance', async () => {
      const { service } = buildService()
      const created = await createInstance(service)

      await service.remove(created.id)

      await expect(service.findAll()).resolves.toHaveLength(0)
    })

    it('throws NotFoundError for a missing instance', async () => {
      const { service } = buildService()

      await expect(service.remove('missing')).rejects.toThrow(NotFoundError)
    })
  })

  describe('start', () => {
    it('starts a stopped instance and leaves it running', async () => {
      const { service, processes } = buildService()
      const created = await createInstance(service)

      const started = await service.start(created.id)

      expect(started.status).toBe('running')
      expect(processes.starts).toBe(1)
    })

    it('recovers from an error state', async () => {
      const repository = new InMemoryServersRepository()
      const versions = new StubVersionProvider()
      const failingProcesses = {
        starts: 0,
        async start() {
          this.starts++
          if (this.starts === 1) throw new Error('container failed')
        },
        async stop() {},
        async kill() {},
      }
      const service = createServersService({
        repository,
        versions,
        processes: failingProcesses,
      })
      const created = await service.create(validInput())

      await expect(service.start(created.id)).rejects.toThrow('container failed')
      await expect(service.findOne(created.id)).resolves.toMatchObject({
        status: 'error',
      })

      const recovered = await service.start(created.id)
      expect(recovered.status).toBe('running')
      expect(failingProcesses.starts).toBe(2)
    })

    it('rejects starting an already running instance', async () => {
      const { service } = buildService()
      const created = await createInstance(service)
      await service.start(created.id)

      await expect(service.start(created.id)).rejects.toThrow(ConflictError)
    })
  })

  describe('stop', () => {
    it('stops a running instance', async () => {
      const { service, processes } = buildService()
      const created = await createInstance(service)
      await service.start(created.id)

      const stopped = await service.stop(created.id)

      expect(stopped.status).toBe('stopped')
      expect(processes.stops).toBe(1)
    })

    it('rejects stopping an already stopped instance', async () => {
      const { service } = buildService()
      const created = await createInstance(service)

      await expect(service.stop(created.id)).rejects.toThrow(ConflictError)
    })
  })

  describe('restart', () => {
    it('restarts a running instance', async () => {
      const { service, processes } = buildService()
      const created = await createInstance(service)
      await service.start(created.id)

      const restarted = await service.restart(created.id)

      expect(restarted.status).toBe('running')
      expect(processes.stops).toBe(1)
      expect(processes.starts).toBe(2)
    })

    it('starts a stopped instance on restart', async () => {
      const { service, processes } = buildService()
      const created = await createInstance(service)

      const restarted = await service.restart(created.id)

      expect(restarted.status).toBe('running')
      expect(processes.starts).toBe(1)
    })
  })

  describe('kill', () => {
    it('kills a running instance', async () => {
      const { service, processes } = buildService()
      const created = await createInstance(service)
      await service.start(created.id)

      const killed = await service.kill(created.id)

      expect(killed.status).toBe('stopped')
      expect(processes.kills).toBe(1)
    })

    it('rejects killing a stopped instance', async () => {
      const { service } = buildService()
      const created = await createInstance(service)

      await expect(service.kill(created.id)).rejects.toThrow(ConflictError)
    })
  })

  describe('events', () => {
    it('emits server.created with the instance payload', async () => {
      const { service, events } = buildServiceWithEvents()

      const created = await service.create(validInput())

      expect(events.emitted).toEqual([
        expect.objectContaining({
          type: 'server.created',
          data: { serverId: created.id, name: created.name },
        }),
      ])
    })

    it('emits server.started on start', async () => {
      const { service, events } = buildServiceWithEvents()
      const created = await service.create(validInput())

      await service.start(created.id)

      expect(events.emitted).toContainEqual(
        expect.objectContaining({
          type: 'server.started',
          data: { serverId: created.id, name: created.name },
        }),
      )
    })

    it('emits server.stopped on stop', async () => {
      const { service, events } = buildServiceWithEvents()
      const created = await service.create(validInput())
      await service.start(created.id)

      await service.stop(created.id)

      expect(events.emitted).toContainEqual(
        expect.objectContaining({
          type: 'server.stopped',
          data: { serverId: created.id, name: created.name },
        }),
      )
    })

    it('emits server.removed on remove', async () => {
      const { service, events } = buildServiceWithEvents()
      const created = await service.create(validInput())

      await service.remove(created.id)

      expect(events.emitted).toContainEqual(
        expect.objectContaining({
          type: 'server.removed',
          data: { serverId: created.id, name: created.name },
        }),
      )
    })
  })
})
