import * as net from 'node:net'

export interface ConnectionProbe {
  listen(serverId: string, port: number, onConnection: () => void): Promise<void>
  close(serverId: string): Promise<void>
}

export const CONNECTION_PROBE = Symbol('ConnectionProbe')

export interface NetServerLike {
  once(event: string, cb: (...args: never[]) => void): this
  removeListener(event: string, cb: (...args: never[]) => void): this
  listen(port: number, cb?: () => void): this
  close(cb?: (err?: Error) => void): this
  listening: boolean
}

export interface ConnectionProbeNet {
  createServer(onConnection?: (socket: unknown) => void): NetServerLike
}

const defaultNet: ConnectionProbeNet = {
  createServer: (onConnection) =>
    net.createServer(onConnection as (socket: net.Socket) => void) as unknown as NetServerLike,
}

export class TcpConnectionProbe implements ConnectionProbe {
  private readonly servers = new Map<string, NetServerLike>()

  constructor(private readonly deps: ConnectionProbeNet = defaultNet) {}

  async listen(serverId: string, port: number, onConnection: () => void): Promise<void> {
    await this.close(serverId)
    const server = this.deps.createServer((socket) => {
      if (socket && typeof socket === 'object' && 'destroy' in socket) {
        ;(socket as { destroy(): void }).destroy()
      }
      onConnection()
    })
    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => {
        reject(err)
      }
      server.once('error', onError)
      server.listen(port, () => {
        server.removeListener('error', onError)
        resolve()
      })
    })
    this.servers.set(serverId, server)
  }

  async close(serverId: string): Promise<void> {
    const server = this.servers.get(serverId)
    if (!server) {
      return
    }
    this.servers.delete(serverId)
    if (!server.listening) {
      return
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  }
}
