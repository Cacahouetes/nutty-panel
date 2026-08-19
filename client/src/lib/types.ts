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