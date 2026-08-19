import { randomUUID } from 'node:crypto'
import type { ServerInstance, ServerType } from './server-instance'
import {
  DEFAULT_CPU_PERCENT,
  DEFAULT_MEMORY_MB,
  MAX_CPU_PERCENT,
  MAX_PORT,
  MIN_MEMORY_MB,
  MIN_PORT,
  SERVER_TYPES,
  type ServerStatus,
} from './server-instance'
import type { MinecraftVersionProvider } from './minecraft-version.provider'
import type { ServerProcessManager } from './server-process.manager'
import type { ServersRepository } from './servers.repository'

export interface CreateServerInput {
  name: string
  type: ServerType
  version: string
  port: number
  memoryMb?: number
  cpuPercent?: number
}

export interface UpdateServerInput {
  name?: string
  memoryMb?: number
  cpuPercent?: number
}

export interface ServersService {
  create(input: CreateServerInput): Promise<ServerInstance>
  findAll(): Promise<ServerInstance[]>
  findOne(id: string): Promise<ServerInstance>
  update(id: string, input: UpdateServerInput): Promise<ServerInstance>
  remove(id: string): Promise<void>
  start(id: string): Promise<ServerInstance>
  stop(id: string): Promise<ServerInstance>
  restart(id: string): Promise<ServerInstance>
  kill(id: string): Promise<ServerInstance>
}

export const SERVERS_SERVICE = Symbol('ServersService')

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export interface ServersServiceDeps {
  repository: ServersRepository
  versions: MinecraftVersionProvider
  processes: ServerProcessManager
}

export function createServersService(deps: ServersServiceDeps): ServersService {
  return new DefaultServersService(deps)
}

const ACTIVE_STATUSES: readonly ServerStatus[] = ['starting', 'running', 'stopping']

class DefaultServersService implements ServersService {
  constructor(private readonly deps: ServersServiceDeps) {}

  async create(input: CreateServerInput): Promise<ServerInstance> {
    if (!input.name || !input.name.trim()) {
      throw new ValidationError('name is required')
    }
    if (!SERVER_TYPES.includes(input.type)) {
      throw new ValidationError(`unsupported server type: ${input.type}`)
    }
    if (input.port < MIN_PORT || input.port > MAX_PORT) {
      throw new ValidationError(`port must be between ${MIN_PORT} and ${MAX_PORT}`)
    }
    if (input.memoryMb !== undefined && input.memoryMb < MIN_MEMORY_MB) {
      throw new ValidationError(`memoryMb must be at least ${MIN_MEMORY_MB}`)
    }
    if (
      input.cpuPercent !== undefined &&
      (input.cpuPercent < 1 || input.cpuPercent > MAX_CPU_PERCENT)
    ) {
      throw new ValidationError(`cpuPercent must be between 1 and ${MAX_CPU_PERCENT}`)
    }
    const supported = await this.deps.versions.isVersionSupported(input.type, input.version)
    if (!supported) {
      throw new ValidationError(`unsupported version: ${input.version}`)
    }
    const existing = await this.deps.repository.findByPort(input.port)
    if (existing) {
      throw new ConflictError(`port ${input.port} is already in use`)
    }
    const now = new Date()
    const instance: ServerInstance = {
      id: randomUUID(),
      name: input.name.trim(),
      type: input.type,
      version: input.version,
      port: input.port,
      memoryMb: input.memoryMb ?? DEFAULT_MEMORY_MB,
      cpuPercent: input.cpuPercent ?? DEFAULT_CPU_PERCENT,
      status: 'stopped',
      createdAt: now,
      updatedAt: now,
    }
    return this.deps.repository.create(instance)
  }

  async findAll(): Promise<ServerInstance[]> {
    return this.deps.repository.findAll()
  }

  async findOne(id: string): Promise<ServerInstance> {
    return this.mustFind(id)
  }

  async update(id: string, input: UpdateServerInput): Promise<ServerInstance> {
    const instance = await this.mustFind(id)
    if (input.name !== undefined) {
      if (!input.name.trim()) throw new ValidationError('name is required')
      instance.name = input.name.trim()
    }
    if (input.memoryMb !== undefined) {
      instance.memoryMb = input.memoryMb
    }
    if (input.cpuPercent !== undefined) {
      instance.cpuPercent = input.cpuPercent
    }
    return this.persist(instance)
  }

  async remove(id: string): Promise<void> {
    await this.mustFind(id)
    await this.deps.repository.remove(id)
  }

  async start(id: string): Promise<ServerInstance> {
    const instance = await this.mustFind(id)
    if (instance.status !== 'stopped' && instance.status !== 'error') {
      throw new ConflictError(`cannot start a server in ${instance.status} state`)
    }
    const starting = await this.persist({ ...instance, status: 'starting' })
    try {
      await this.deps.processes.start(starting)
      return this.persist({ ...starting, status: 'running' })
    } catch (err) {
      await this.persist({
        ...starting,
        status: 'error',
        updatedAt: new Date(),
      })
      throw err
    }
  }

  async stop(id: string): Promise<ServerInstance> {
    const instance = await this.mustFind(id)
    if (instance.status !== 'running') {
      throw new ConflictError(`cannot stop a server in ${instance.status} state`)
    }
    const stopping = await this.persist({ ...instance, status: 'stopping' })
    try {
      await this.deps.processes.stop(stopping)
      return this.persist({ ...stopping, status: 'stopped' })
    } catch (err) {
      await this.persist({
        ...stopping,
        status: 'error',
        updatedAt: new Date(),
      })
      throw err
    }
  }

  async restart(id: string): Promise<ServerInstance> {
    const instance = await this.mustFind(id)
    if (instance.status === 'running') {
      await this.stop(id)
    } else if (instance.status !== 'stopped' && instance.status !== 'error') {
      throw new ConflictError(`cannot restart a server in ${instance.status} state`)
    }
    return this.start(id)
  }

  async kill(id: string): Promise<ServerInstance> {
    const instance = await this.mustFind(id)
    if (!ACTIVE_STATUSES.includes(instance.status)) {
      throw new ConflictError(`cannot kill a server in ${instance.status} state`)
    }
    await this.deps.processes.kill(instance)
    return this.persist({ ...instance, status: 'stopped' })
  }

  private async mustFind(id: string): Promise<ServerInstance> {
    const instance = await this.deps.repository.findById(id)
    if (!instance) {
      throw new NotFoundError(`server not found: ${id}`)
    }
    return instance
  }

  private async persist(instance: ServerInstance): Promise<ServerInstance> {
    return this.deps.repository.update({ ...instance, updatedAt: new Date() })
  }
}
