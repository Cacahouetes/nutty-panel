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

export interface CreateServerInput {
  name: string
  type: ServerType
  version: string
  port: number
  memoryMb?: number
  cpuPercent?: number
}

export interface UpdateServerInput {
  name?: string
  memoryMb?: number
  cpuPercent?: number
}

export const SERVER_TYPE_LABELS: Record<ServerType, string> = {
  vanilla: 'Vanilla',
  paper: 'Paper',
  spigot: 'Spigot',
  fabric: 'Fabric',
  forge: 'Forge',
  bedrock: 'Bedrock',
}

export const SUPPORTED_VERSIONS: Record<ServerType, readonly string[]> = {
  vanilla: ['1.21.4', '1.21', '1.20.4', '1.20.1', '1.19.4'],
  paper: ['1.21.4', '1.21', '1.20.4'],
  spigot: ['1.21.4', '1.21', '1.20.4'],
  fabric: ['1.21.4', '1.21', '1.20.4'],
  forge: ['1.20.1', '1.19.4'],
  bedrock: ['1.20.81', '1.20.71'],
}

export type FileEntryType = 'file' | 'directory'

export interface FileEntry {
  name: string
  path: string
  type: FileEntryType
  sizeBytes?: number
  modifiedAt?: string
}