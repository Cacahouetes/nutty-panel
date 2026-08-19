import { describe, it, expect } from '@jest/globals'
import { Readable } from 'node:stream'
import type { ServerType } from './server-instance'
import type { ServerInstance } from './server-instance'
import type { ContainerState, DockerServerInput } from '../docker/container'
import { NotFoundError, type Deployment, type DockerService } from '../docker/docker.service'
import { DockerServerProcessManager } from './docker-server-process.manager'

class FakeDockerService implements DockerService {
  deployed: string[] = []
  deployedInputs: DockerServerInput[] = []
  startCalls: string[] = []
  stopCalls: string[] = []
  killCalls: string[] = []

  constructor(initiallyDeployed: string[] = []) {
    this.deployed = [...initiallyDeployed]
  }

  async deploy(server: DockerServerInput): Promise<Deployment> {
    this.deployedInputs.push(server)
    this.deployed.push(server.id)
    return this.deployment(server.id, server.port)
  }

  async start(serverId: string): Promise<Deployment> {
    this.startCalls.push(serverId)
    return this.deployment(serverId)
  }

  async stop(serverId: string): Promise<Deployment> {
    this.stopCalls.push(serverId)
    return this.deployment(serverId)
  }

  async kill(serverId: string): Promise<Deployment> {
    this.killCalls.push(serverId)
    return this.deployment(serverId)
  }

  async restart(serverId: string): Promise<Deployment> {
    return this.deployment(serverId)
  }

  async remove(): Promise<void> {}

  async getStatus(serverId: string): Promise<ContainerState> {
    if (!this.deployed.includes(serverId)) {
      throw new NotFoundError(`server not deployed: ${serverId}`)
    }
    return 'running'
  }

  async getLogs(): Promise<string[]> {
    return []
  }

  async exportData(): Promise<NodeJS.ReadableStream> {
    return Readable.from([])
  }

  async importData(): Promise<void> {}

  async execCommand(): Promise<{ exitCode: number; stdout: Buffer; stderr: Buffer }> {
    return { exitCode: 0, stdout: Buffer.from(''), stderr: Buffer.from('') }
  }

  resolveImage(type: ServerType): string {
    return type === 'bedrock'
      ? 'itzg/minecraft-bedrock-server:latest'
      : 'itzg/minecraft-server:latest'
  }

  private deployment(serverId: string, hostPort = 25565): Deployment {
    return {
      serverId,
      containerId: `container-${serverId}`,
      containerName: `nutty-${serverId}`,
      hostPort,
      image: 'itzg/minecraft-server:latest',
      state: 'running',
    }
  }
}

function buildInstance(overrides: Partial<ServerInstance> = {}): ServerInstance {
  return {
    id: 'server-1',
    name: 'Survival',
    type: 'paper',
    version: '1.20.4',
    port: 25565,
    memoryMb: 2048,
    cpuPercent: 50,
    status: 'starting',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('DockerServerProcessManager', () => {
  it('deploys the container on the first start', async () => {
    const docker = new FakeDockerService()
    const manager = new DockerServerProcessManager(docker)

    await manager.start(buildInstance())

    expect(docker.deployedInputs).toEqual([
      {
        id: 'server-1',
        type: 'paper',
        version: '1.20.4',
        port: 25565,
        memoryMb: 2048,
        cpuPercent: 50,
      },
    ])
    expect(docker.startCalls).toEqual([])
  })

  it('starts the existing container on subsequent starts without re-deploying', async () => {
    const docker = new FakeDockerService(['server-1'])
    const manager = new DockerServerProcessManager(docker)

    await manager.start(buildInstance())

    expect(docker.deployedInputs).toEqual([])
    expect(docker.startCalls).toEqual(['server-1'])
  })

  it('stops through DockerService', async () => {
    const docker = new FakeDockerService(['server-1'])
    const manager = new DockerServerProcessManager(docker)

    await manager.stop(buildInstance())

    expect(docker.stopCalls).toEqual(['server-1'])
  })

  it('kills through DockerService', async () => {
    const docker = new FakeDockerService(['server-1'])
    const manager = new DockerServerProcessManager(docker)

    await manager.kill(buildInstance())

    expect(docker.killCalls).toEqual(['server-1'])
  })
})
