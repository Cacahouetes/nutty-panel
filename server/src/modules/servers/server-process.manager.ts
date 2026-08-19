import type { ServerInstance } from './server-instance'

export interface ServerProcessManager {
  start(instance: ServerInstance): Promise<void>
  stop(instance: ServerInstance): Promise<void>
  kill(instance: ServerInstance): Promise<void>
}

export const SERVER_PROCESS_MANAGER = Symbol('ServerProcessManager')
