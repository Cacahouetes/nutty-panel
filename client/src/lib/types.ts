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

export interface MetricsSnapshot {
  serverId: string
  cpuPercent: number
  memoryUsageBytes: number
  memoryLimitBytes: number
  memoryPercent: number
  readAt: string
}

export interface AutoStartPolicy {
  serverId: string
  enabled: boolean
  inactiveMinutes: number
  lastActivityAt?: string
}

export interface PlayitTunnel {
  serverId: string
  serverName: string
  tunnelId: string
  host: string
  port: number
  createdAt: string
}