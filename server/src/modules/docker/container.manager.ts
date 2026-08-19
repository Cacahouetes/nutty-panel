import type { ContainerSpec, ContainerState } from './container'

export interface ContainerManager {
  create(spec: ContainerSpec): Promise<string>
  start(containerId: string): Promise<void>
  stop(containerId: string): Promise<void>
  kill(containerId: string): Promise<void>
  restart(containerId: string): Promise<void>
  remove(containerId: string): Promise<void>
  inspect(containerId: string): Promise<ContainerState>
  logs(containerId: string, tail?: number): Promise<string[]>
  export(containerId: string): Promise<NodeJS.ReadableStream>
  putArchive(containerId: string, stream: NodeJS.ReadableStream, path: string): Promise<void>
}

export const CONTAINER_MANAGER = Symbol('ContainerManager')
