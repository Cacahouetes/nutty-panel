import { PlayitTunnel, PlayitTunnelStore } from './playit-tunnel-store'

export class InMemoryPlayitTunnelStore implements PlayitTunnelStore {
  private readonly tunnels = new Map<string, PlayitTunnel>()

  save(tunnel: PlayitTunnel): void {
    this.tunnels.set(tunnel.serverId, tunnel)
  }

  get(serverId: string): PlayitTunnel | undefined {
    return this.tunnels.get(serverId)
  }

  all(): PlayitTunnel[] {
    return [...this.tunnels.values()]
  }

  remove(serverId: string): void {
    this.tunnels.delete(serverId)
  }
}
