export interface AutoStartPolicy {
  serverId: string
  enabled: boolean
  inactiveMinutes: number
  lastActivityAt?: Date
}

export interface SetAutoStartInput {
  enabled?: boolean
  inactiveMinutes?: number
}

export const DEFAULT_INACTIVE_MINUTES = 30
export const MIN_INACTIVE_MINUTES = 1
