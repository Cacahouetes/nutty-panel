import type { ServerType } from '../servers/server-instance'

export type ContainerState = 'created' | 'running' | 'stopped' | 'removed'

export interface DockerRawStats {
  read: string
  cpu_stats: {
    cpu_usage: { total_usage: number; usage_in_kernelmode?: number; usage_in_usermode?: number }
    system_cpu_usage: number
    online_cpus?: number
  }
  precpu_stats: {
    cpu_usage: { total_usage: number; usage_in_kernelmode?: number; usage_in_usermode?: number }
    system_cpu_usage: number
  }
  memory_stats: { usage: number; limit: number }
}

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
