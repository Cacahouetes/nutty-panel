export type ServerType = 'vanilla' | 'paper' | 'spigot' | 'fabric' | 'forge' | 'bedrock'

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error'

export interface ServerInstance {
  id: string
  name: string
  type: ServerType
  version: string
  port: number
  memoryMb: number
  cpuPercent: number
  status: ServerStatus
  createdAt: Date
  updatedAt: Date
}

export const SERVER_TYPES: readonly ServerType[] = [
  'vanilla',
  'paper',
  'spigot',
  'fabric',
  'forge',
  'bedrock',
] as const

export const DEFAULT_MEMORY_MB = 2048
export const DEFAULT_CPU_PERCENT = 100
export const MIN_PORT = 25565
export const MAX_PORT = 30000
export const MIN_MEMORY_MB = 256
export const MAX_CPU_PERCENT = 100
