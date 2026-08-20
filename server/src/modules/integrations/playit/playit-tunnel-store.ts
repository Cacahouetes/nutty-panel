export interface PlayitTunnel {
  serverId: string
  serverName: string
  tunnelId: string
  host: string
  port: number
  createdAt: Date
}

export interface PlayitTunnelStore {
  save(tunnel: PlayitTunnel): void
  get(serverId: string): PlayitTunnel | undefined
  all(): PlayitTunnel[]
  remove(serverId: string): void
}

export const PLAYIT_TUNNEL_STORE = Symbol('PlayitTunnelStore')
