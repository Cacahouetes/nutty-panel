import { describe, it, expect } from '@jest/globals'
import {
  ConflictError,
  NotFoundError,
  createDockerService,
  type DockerService,
} from './docker.service'
import type { ContainerManager } from './container.manager'
import type { ContainerSpec, ContainerState, DockerServerInput } from './container'

class FakeContainerManager implements ContainerManager {
  createdSpecs: ContainerSpec[] = []
  startedIds: string[] = []
  states = new Map<string, ContainerState>()
  logsByContainer = new Map<string, string[]>()

  async create(spec: ContainerSpec): Promise<string> {
    this.createdSpecs.push(spec)
    const id = `container-${this.createdSpecs.length}`
    this.states.set(id, 'created')
    this.logsByContainer.set(id, [])
    return id
  }

  async start(containerId: string): Promise<void> {
    this.startedIds.push(containerId)
    this.states.set(containerId, 'running')
  }

  async stop(containerId: string): Promise<void> {
    this.states.set(containerId, 'stopped')
  }

  async kill(containerId: string): Promise<void> {
    this.states.set(containerId, 'stopped')
  }

  async restart(containerId: string): Promise<void> {
    this.states.set(containerId, 'running')
  }

  async remove(containerId: string): Promise<void> {
    this.states.set(containerId, 'removed')
  }

  async inspect(containerId: string): Promise<ContainerState> {
    return this.states.get(containerId) ?? 'created'
  }

  async logs(containerId: string, tail?: number): Promise<string[]> {
    const all = this.logsByContainer.get(containerId) ?? []
    return tail ? all.slice(-tail) : all
  }
}

function buildDockerService(): DockerService {
  return createDockerService({ containerManager: new FakeContainerManager() })
}

describe('DockerService', () => {
  describe('resolveImage', () => {
    it('maps vanilla, paper, spigot, fabric and forge to the itzg minecraft image', () => {
      const service = buildDockerService()

      for (const type of ['vanilla', 'paper', 'spigot', 'fabric', 'forge'] as const) {
        expect(service.resolveImage(type)).toBe('itzg/minecraft-server:latest')
      }
    })

    it('maps bedrock to the itzg bedrock image', () => {
      expect(buildDockerService().resolveImage('bedrock')).toBe(
        'itzg/minecraft-bedrock-server:latest',
      )
    })
  })

  describe('deploy', () => {
    it('creates and starts a container from a server instance', async () => {
      const fake = new FakeContainerManager()
      const service = createDockerService({ containerManager: fake })

      const deployment = await service.deploy({
        id: 'server-1',
        type: 'paper',
        version: '1.20.4',
        port: 25565,
        memoryMb: 2048,
        cpuPercent: 50,
      })

      expect(fake.createdSpecs).toHaveLength(1)
      const spec = fake.createdSpecs[0]
      expect(spec.name).toBe('nutty-server-1')
      expect(spec.image).toBe('itzg/minecraft-server:latest')
      expect(spec.env.EULA).toBe('TRUE')
      expect(spec.env.TYPE).toBe('paper')
      expect(spec.env.VERSION).toBe('1.20.4')
      expect(spec.env.MEMORY).toBe('2048M')
      expect(spec.ports).toEqual([{ containerPort: 25565, hostPort: 25565 }])
      expect(spec.resources).toEqual({ cpuPercent: 50, memoryMb: 2048 })
      expect(spec.volumeName).toBe('nutty-server-1-data')
      expect(spec.mountPath).toBe('/data')

      expect(fake.startedIds).toEqual([deployment.containerId])
      expect(deployment).toMatchObject({
        serverId: 'server-1',
        containerName: 'nutty-server-1',
        hostPort: 25565,
        image: 'itzg/minecraft-server:latest',
        state: 'running',
      })
    })

    it('rejects a second server on the same host port with ConflictError', async () => {
      const service = buildDockerService()
      const base: Omit<DockerServerInput, 'id'> = {
        type: 'paper',
        version: '1.20.4',
        port: 25565,
        memoryMb: 2048,
        cpuPercent: 50,
      }

      await service.deploy({ ...base, id: 'server-1' })
      await expect(service.deploy({ ...base, id: 'server-2' })).rejects.toThrow(ConflictError)
    })

    it('rejects re-deploying the same server with ConflictError', async () => {
      const service = buildDockerService()
      const server: DockerServerInput = {
        id: 'server-1',
        type: 'paper',
        version: '1.20.4',
        port: 25565,
        memoryMb: 2048,
        cpuPercent: 50,
      }

      await service.deploy(server)
      await expect(service.deploy(server)).rejects.toThrow(ConflictError)
    })
  })

  describe('undeployed servers', () => {
    it('throws NotFoundError on start for an unknown server', async () => {
      await expect(buildDockerService().start('missing')).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError on remove for an unknown server', async () => {
      await expect(buildDockerService().remove('missing')).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError on getStatus for an unknown server', async () => {
      await expect(buildDockerService().getStatus('missing')).rejects.toThrow(NotFoundError)
    })
  })

  describe('lifecycle', () => {
    const server: DockerServerInput = {
      id: 'server-1',
      type: 'paper',
      version: '1.20.4',
      port: 25565,
      memoryMb: 2048,
      cpuPercent: 50,
    }

    it('starts, stops, restarts and removes a deployed container', async () => {
      const fake = new FakeContainerManager()
      const service = createDockerService({ containerManager: fake })
      await service.deploy(server)

      const running = await service.start(server.id)
      expect(running.state).toBe('running')

      const stopped = await service.stop(server.id)
      expect(stopped.state).toBe('stopped')

      const restarted = await service.restart(server.id)
      expect(restarted.state).toBe('running')

      await service.remove(server.id)
      expect(fake.states.get('container-1')).toBe('removed')
    })

    it('kills a deployed container and reports it stopped', async () => {
      const fake = new FakeContainerManager()
      const service = createDockerService({ containerManager: fake })
      await service.deploy(server)

      const killed = await service.kill(server.id)
      expect(killed.state).toBe('stopped')
      expect(fake.states.get('container-1')).toBe('stopped')
    })

    it('reports the container state through getStatus', async () => {
      const fake = new FakeContainerManager()
      const service = createDockerService({ containerManager: fake })
      await service.deploy(server)

      await service.stop(server.id)
      expect(await service.getStatus(server.id)).toBe('stopped')
    })

    it('frees the host port after removal so the server can be re-deployed', async () => {
      const service = buildDockerService()
      await service.deploy(server)
      await service.remove(server.id)

      const redeployed = await service.deploy(server)
      expect(redeployed.hostPort).toBe(25565)
    })
  })

  describe('getLogs', () => {
    const server: DockerServerInput = {
      id: 'server-1',
      type: 'paper',
      version: '1.20.4',
      port: 25565,
      memoryMb: 2048,
      cpuPercent: 50,
    }

    it('returns the container logs trimmed to the requested tail', async () => {
      const fake = new FakeContainerManager()
      const service = createDockerService({ containerManager: fake })
      await service.deploy(server)
      fake.logsByContainer.set('container-1', ['a', 'b', 'c'])

      await expect(service.getLogs(server.id, 2)).resolves.toEqual(['b', 'c'])
      await expect(service.getLogs(server.id)).resolves.toEqual(['a', 'b', 'c'])
    })
  })
})
