import type { ServerType } from '../servers/server-instance'

export type ContainerState = 'created' | 'running' | 'stopped' | 'removed'

export interface ContainerPort {
  containerPort: number
  hostPort: number
}

export interface ContainerResources {
  cpuPercent: number
  memoryMb: number
  diskMb?: number
}

export interface ContainerSpec {
  name: string
  image: string
  env: Record<string, string>
  ports: ContainerPort[]
  resources: ContainerResources
  volumeName: string
  mountPath: string
  cmd?: string[]
}

export interface ContainerRef {
  id: string
  name: string
}

export interface DockerServerInput {
  id: string
  type: ServerType
  version: string
  port: number
  memoryMb: number
  cpuPercent: number
}

export const CONTAINER_MOUNT_PATH = '/data'
export const MINECRAFT_CONTAINER_PORT = 25565
export const CONTAINER_NAME_PREFIX = 'nutty-'
