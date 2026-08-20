import * as net from 'node:net'
import { IncompleteHandshakeError, parseMinecraftHandshake } from './handshake'
import type { RouteResolver, ProxyRouteTarget } from './route-resolver'

export interface ProxySocket {
  write(data: Buffer): boolean
  pipe(destination: ProxySocket): ProxySocket
  on(event: string, listener: (...args: never[]) => void): this
  once(event: string, listener: (...args: never[]) => void): this
  removeListener(event: string, listener: (...args: never[]) => void): this
  destroy(): void
}

export interface ProxyServer {
  once(event: string, listener: (...args: never[]) => void): this
  removeListener(event: string, listener: (...args: never[]) => void): this
  listen(port: number, host?: string, callback?: () => void): this
  close(callback?: (err?: Error) => void): this
  listening: boolean
}

export interface ProxyNet {
  createServer(onConnection: (socket: ProxySocket) => void): ProxyServer
  connect(options: { host: string; port: number }): ProxySocket
}

const defaultNet: ProxyNet = {
  createServer: (onConnection) =>
    net.createServer(onConnection as (socket: net.Socket) => void) as unknown as ProxyServer,
  connect: (options) => net.connect(options) as unknown as ProxySocket,
}

export interface SmartProxy {
  start(options: { resolver: RouteResolver; port: number; host?: string }): Promise<void>
  stop(): Promise<void>
  isListening(): boolean
}

export const SMART_PROXY = Symbol('SmartProxy')

export interface SmartProxyDeps {
  net?: ProxyNet
}

export function createSmartProxy(deps: SmartProxyDeps = {}): SmartProxy {
  const netImpl = deps.net ?? defaultNet
  let server: ProxyServer | undefined

  function forward(client: ProxySocket, target: ProxyRouteTarget, leftover: Buffer): void {
    const upstream = netImpl.connect(target)
    let connected = false
    upstream.once('error', () => {
      client.destroy()
    })
    upstream.once('connect', () => {
      connected = true
      if (leftover.length > 0) {
        upstream.write(leftover)
      }
      client.pipe(upstream)
      upstream.pipe(client)
    })
    client.once('error', () => {
      if (connected) {
        upstream.destroy()
      }
    })
    client.once('close', () => {
      upstream.destroy()
    })
    upstream.once('close', () => {
      client.destroy()
    })
  }

  function createHandler(resolver: RouteResolver): (client: ProxySocket) => void {
    return (client: ProxySocket) => {
      const chunks: Buffer[] = []
      let resolved = false

      const tryResolve = (): void => {
        if (resolved) {
          return
        }
        const data = Buffer.concat(chunks)
        let parsed
        try {
          parsed = parseMinecraftHandshake(data)
        } catch (err) {
          if (err instanceof IncompleteHandshakeError) {
            return
          }
          client.destroy()
          return
        }
        resolved = true
        let target: ProxyRouteTarget
        try {
          target = resolver.resolve(parsed.serverAddress, parsed.serverPort)
        } catch {
          client.destroy()
          return
        }
        forward(client, target, data)
      }

      client.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        tryResolve()
      })
      client.once('error', () => client.destroy())
    }
  }

  return {
    async start(options): Promise<void> {
      server = netImpl.createServer(createHandler(options.resolver))
      await new Promise<void>((resolve, reject) => {
        const onError = (err: Error) => {
          reject(err)
        }
        server!.once('error', onError)
        server!.listen(options.port, options.host, () => {
          server!.removeListener('error', onError)
          resolve()
        })
      })
    },
    async stop(): Promise<void> {
      const current = server
      server = undefined
      if (!current) {
        return
      }
      await new Promise<void>((resolve) => {
        current.close(() => resolve())
      })
    },
    isListening(): boolean {
      return server?.listening ?? false
    },
  }
}
