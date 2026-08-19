import type { ServerInstance } from './server-instance'
import type { ServersRepository } from './servers.repository'

export class InMemoryServersRepository implements ServersRepository {
  private readonly instances = new Map<string, ServerInstance>()

  async create(instance: ServerInstance): Promise<ServerInstance> {
    this.instances.set(instance.id, instance)
    return instance
  }

  async findAll(): Promise<ServerInstance[]> {
    return [...this.instances.values()]
  }

  async findById(id: string): Promise<ServerInstance | null> {
    return this.instances.get(id) ?? null
  }

  async findByPort(port: number): Promise<ServerInstance | null> {
    for (const instance of this.instances.values()) {
      if (instance.port === port) return instance
    }
    return null
  }

  async update(instance: ServerInstance): Promise<ServerInstance> {
    this.instances.set(instance.id, instance)
    return instance
  }

  async remove(id: string): Promise<void> {
    this.instances.delete(id)
  }
}
