import type { ServerInstance } from './server-instance'

export interface ServersRepository {
  create(instance: ServerInstance): Promise<ServerInstance>
  findAll(): Promise<ServerInstance[]>
  findById(id: string): Promise<ServerInstance | null>
  findByPort(port: number): Promise<ServerInstance | null>
  update(instance: ServerInstance): Promise<ServerInstance>
  remove(id: string): Promise<void>
}

export const SERVERS_REPOSITORY = Symbol('ServersRepository')
