import type { ServerType } from '../servers/server-instance'

export interface ServerTypeResolver {
  getServerType(serverId: string): Promise<ServerType>
}

export const SERVER_TYPE_RESOLVER = Symbol('ServerTypeResolver')
