import type { ServerType } from '../servers/server-instance'
import type { ContainerManager } from './container.manager'
import {
  CONTAINER_MOUNT_PATH,
  CONTAINER_NAME_PREFIX,
  MINECRAFT_CONTAINER_PORT,
  type ContainerRef,
  type ContainerSpec,
  type ContainerState,
  type DockerServerInput,
} from './container'
import { resolveImage } from './images'

export interface Deployment {
  serverId: string
  containerId: string
  containerName: string
  hostPort: number
  image: string
  state: ContainerState
}

export interface DockerService {
  deploy(server: DockerServerInput): Promise<Deployment>
  start(serverId: string): Promise<Deployment>
  stop(serverId: string): Promise<Deployment>
  restart(serverId: string): Promise<Deployment>
  remove(serverId: string): Promise<void>
  getStatus(serverId: string): Promise<ContainerState>
  getLogs(serverId: string, tail?: number): Promise<string[]>
  resolveImage(type: ServerType): string
}

export const DOCKER_SERVICE = Symbol('DockerService')

export interface DockerServiceDeps {
  containerManager: ContainerManager
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export function createDockerService(deps: DockerServiceDeps): DockerService {
  return new DefaultDockerService(deps)
}

class DefaultDockerService implements DockerService {
  private readonly deployments = new Map<string, StoredDeployment>()
  private readonly hostPorts = new Map<number, string>()

  constructor(private readonly deps: DockerServiceDeps) {}

  async deploy(server: DockerServerInput): Promise<Deployment> {
    if (this.deployments.has(server.id)) {
      throw new ConflictError(`server already deployed: ${server.id}`)
    }
    const owner = this.hostPorts.get(server.port)
    if (owner && owner !== server.id) {
      throw new ConflictError(`host port ${server.port} is already in use by server ${owner}`)
    }
    const containerName = `${CONTAINER_NAME_PREFIX}${server.id}`
    const spec: ContainerSpec = {
      name: containerName,
      image: resolveImage(server.type),
      env: {
        EULA: 'TRUE',
        TYPE: server.type,
        VERSION: server.version,
        MEMORY: `${server.memoryMb}M`,
      },
      ports: [{ containerPort: MINECRAFT_CONTAINER_PORT, hostPort: server.port }],
      resources: { cpuPercent: server.cpuPercent, memoryMb: server.memoryMb },
      volumeName: `${containerName}-data`,
      mountPath: CONTAINER_MOUNT_PATH,
    }
    const containerId = await this.deps.containerManager.create(spec)
    await this.deps.containerManager.start(containerId)
    this.deployments.set(server.id, {
      ref: { id: containerId, name: containerName },
      hostPort: server.port,
      image: spec.image,
    })
    this.hostPorts.set(server.port, server.id)
    return this.toDeployment(server.id)
  }

  async start(serverId: string): Promise<Deployment> {
    const stored = this.mustFind(serverId)
    await this.deps.containerManager.start(stored.ref.id)
    return this.toDeployment(serverId)
  }

  async stop(serverId: string): Promise<Deployment> {
    const stored = this.mustFind(serverId)
    await this.deps.containerManager.stop(stored.ref.id)
    return this.toDeployment(serverId)
  }

  async restart(serverId: string): Promise<Deployment> {
    const stored = this.mustFind(serverId)
    await this.deps.containerManager.restart(stored.ref.id)
    return this.toDeployment(serverId)
  }

  async remove(serverId: string): Promise<void> {
    const stored = this.mustFind(serverId)
    await this.deps.containerManager.remove(stored.ref.id)
    this.deployments.delete(serverId)
    this.hostPorts.delete(stored.hostPort)
  }

  async getStatus(serverId: string): Promise<ContainerState> {
    const stored = this.mustFind(serverId)
    return this.deps.containerManager.inspect(stored.ref.id)
  }

  async getLogs(serverId: string, tail?: number): Promise<string[]> {
    const stored = this.mustFind(serverId)
    return this.deps.containerManager.logs(stored.ref.id, tail)
  }

  resolveImage(type: ServerType): string {
    return resolveImage(type)
  }

  private async toDeployment(serverId: string): Promise<Deployment> {
    const stored = this.mustFind(serverId)
    const state = await this.deps.containerManager.inspect(stored.ref.id)
    return {
      serverId,
      containerId: stored.ref.id,
      containerName: stored.ref.name,
      hostPort: stored.hostPort,
      image: stored.image,
      state,
    }
  }

  private mustFind(serverId: string): StoredDeployment {
    const stored = this.deployments.get(serverId)
    if (!stored) {
      throw new NotFoundError(`server not deployed: ${serverId}`)
    }
    return stored
  }
}

interface StoredDeployment {
  ref: ContainerRef
  hostPort: number
  image: string
}
