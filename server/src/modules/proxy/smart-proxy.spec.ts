import { describe, it, expect } from '@jest/globals'
import {
  createSmartProxy,
  type ProxyNet,
  type ProxyServer,
  type ProxySocket,
  type SmartProxy,
} from './smart-proxy'
import { createRouteResolver, type ProxyRoute, type RouteResolver } from './route-resolver'

class FakeSocket implements ProxySocket {
  chunks: Buffer[] = []
  pipedTo: FakeSocket | undefined
  pipedFrom: FakeSocket | undefined
  destroyed = false
  private readonly handlers = new Map<string, (...args: never[]) => void>()

  write(data: Buffer): boolean {
    this.chunks.push(data)
    return true
  }

  pipe(destination: FakeSocket): FakeSocket {
    this.pipedTo = destination
    destination.pipedFrom = this
    return destination
  }

  on(event: string, listener: (...args: never[]) => void): this {
    this.handlers.set(`on:${event}`, listener)
    return this
  }

  once(event: string, listener: (...args: never[]) => void): this {
    this.handlers.set(`once:${event}`, listener)
    return this
  }

  removeListener(event: string, listener: (...args: never[]) => void): this {
    if (this.handlers.get(`on:${event}`) === listener) {
      this.handlers.delete(`on:${event}`)
    }
    if (this.handlers.get(`once:${event}`) === listener) {
      this.handlers.delete(`once:${event}`)
    }
    return this
  }

  destroy(): void {
    if (!this.destroyed) {
      this.destroyed = true
      this.emit('close')
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const handler = this.handlers.get(`on:${event}`) ?? this.handlers.get(`once:${event}`)
    if (this.handlers.has(`once:${event}`)) {
      this.handlers.delete(`once:${event}`)
    }
    handler?.(...(args as never[]))
  }
}

class FakeServer implements ProxyServer {
  listening = false
  private readonly connectionListener?: (socket: FakeSocket) => void
  private readonly onceHandlers = new Map<string, (...args: never[]) => void>()

  constructor(connectionListener?: (socket: FakeSocket) => void) {
    this.connectionListener = connectionListener
  }

  once(event: string, listener: (...args: never[]) => void): this {
    this.onceHandlers.set(event, listener)
    return this
  }

  removeListener(event: string, listener: (...args: never[]) => void): this {
    if (this.onceHandlers.get(event) === listener) {
      this.onceHandlers.delete(event)
    }
    return this
  }

  listen(port: number, _host?: string, callback?: () => void): this {
    this.listening = true
    callback?.()
    return this
  }

  close(callback?: (err?: Error) => void): this {
    this.listening = false
    callback?.()
    return this
  }

  accept(socket: FakeSocket): void {
    this.connectionListener?.(socket)
  }
}

class FakeNet implements ProxyNet {
  servers: FakeServer[] = []
  upstreams: FakeSocket[] = []
  connected: Array<{ host: string; port: number }> = []
  failConnect = false

  createServer(connectionListener?: (socket: FakeSocket) => void): FakeServer {
    const server = new FakeServer(connectionListener)
    this.servers.push(server)
    return server
  }

  connect(options: { host: string; port: number }): FakeSocket {
    this.connected.push(options)
    const upstream = new FakeSocket()
    this.upstreams.push(upstream)
    queueMicrotask(() => {
      if (!this.failConnect) {
        upstream.emit('connect')
      } else {
        upstream.emit('error', new Error('ECONNREFUSED'))
      }
    })
    return upstream
  }
}

const ROUTES: ProxyRoute[] = [
  {
    serverId: 'lobby',
    name: 'Lobby',
    targetHost: '127.0.0.1',
    targetPort: 25566,
    hostnames: ['lobby.play.example.com'],
  },
]

function encodeVarInt(value: number): number[] {
  const bytes: number[] = []
  let remaining = value
  while (true) {
    const byte = remaining & 0x7f
    remaining >>>= 7
    if (remaining === 0) {
      bytes.push(byte)
      break
    }
    bytes.push(byte | 0x80)
  }
  return bytes
}

function handshakeFor(host: string): Buffer {
  const address = Buffer.from(host, 'utf8')
  const packet = Buffer.concat([
    Buffer.from([0x00]),
    Buffer.from(encodeVarInt(767)),
    Buffer.from(encodeVarInt(address.length)),
    address,
    Buffer.from([0x63, 0xdd]),
    Buffer.from(encodeVarInt(2)),
  ])
  return Buffer.concat([Buffer.from(encodeVarInt(packet.length)), packet])
}

function build() {
  const net = new FakeNet()
  const resolver: RouteResolver = createRouteResolver(ROUTES)
  const proxy: SmartProxy = createSmartProxy({ net })
  return { net, resolver, proxy }
}

describe('createSmartProxy', () => {
  it('listens on the public port', async () => {
    const { net, resolver, proxy } = build()

    await proxy.start({ resolver, port: 25565 })

    expect(net.servers[0].listening).toBe(true)
    expect(proxy.isListening()).toBe(true)
  })

  it('resolves the handshake and connects to the matching upstream', async () => {
    const { net, resolver, proxy } = build()
    await proxy.start({ resolver, port: 25565 })

    const client = new FakeSocket()
    net.servers[0].accept(client)

    client.emit('data', handshakeFor('lobby.play.example.com'))

    expect(net.connected).toEqual([{ host: '127.0.0.1', port: 25566 }])
  })

  it('forwards the handshake and leftover bytes and pipes both directions', async () => {
    const { net, resolver, proxy } = build()
    await proxy.start({ resolver, port: 25565 })

    const client = new FakeSocket()
    net.servers[0].accept(client)

    const handshake = handshakeFor('lobby.play.example.com')
    const payload = Buffer.from([0xde, 0xad, 0xbe, 0xef])
    const full = Buffer.concat([handshake, payload])
    client.emit('data', full)
    await Promise.resolve()

    const upstream = net.upstreams[0]
    expect(upstream.chunks).toEqual([full])
    expect(client.pipedTo).toBe(upstream)
    expect(upstream.pipedFrom).toBe(client)
  })

  it('waits for more data when the handshake is split across chunks', async () => {
    const { net, resolver, proxy } = build()
    await proxy.start({ resolver, port: 25565 })

    const client = new FakeSocket()
    net.servers[0].accept(client)

    const handshake = handshakeFor('lobby.play.example.com')
    client.emit('data', handshake.subarray(0, 3))
    expect(net.connected).toHaveLength(0)

    client.emit('data', handshake.subarray(3))
    expect(net.connected).toHaveLength(1)
  })

  it('destroys the client when no route matches', async () => {
    const { net, resolver, proxy } = build()
    await proxy.start({ resolver, port: 25565 })

    const client = new FakeSocket()
    net.servers[0].accept(client)

    client.emit('data', handshakeFor('unknown.example.com'))

    expect(client.destroyed).toBe(true)
    expect(net.upstreams).toHaveLength(0)
  })

  it('destroys the client on an invalid handshake', async () => {
    const { net, resolver, proxy } = build()
    await proxy.start({ resolver, port: 25565 })

    const client = new FakeSocket()
    net.servers[0].accept(client)

    client.emit('data', Buffer.from([0x02, 0x01, 0x02]))

    expect(client.destroyed).toBe(true)
  })

  it('destroys the client when the upstream connection fails', async () => {
    const { net, resolver, proxy } = build()
    net.failConnect = true
    await proxy.start({ resolver, port: 25565 })

    const client = new FakeSocket()
    net.servers[0].accept(client)

    client.emit('data', handshakeFor('lobby.play.example.com'))
    await Promise.resolve()

    expect(client.destroyed).toBe(true)
  })

  it('stops listening on stop()', async () => {
    const { net, resolver, proxy } = build()
    await proxy.start({ resolver, port: 25565 })

    await proxy.stop()

    expect(net.servers[0].listening).toBe(false)
    expect(proxy.isListening()).toBe(false)
  })
})
