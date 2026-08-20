import { describe, it, expect } from '@jest/globals'
import * as net from 'node:net'
import { TcpConnectionProbe, type ConnectionProbeNet, type NetServerLike } from './connection.probe'

class FakeServer implements NetServerLike {
  listening = false
  private handlers = new Map<string, (...args: never[]) => void>()
  private readonly connectionListener?: (socket: unknown) => void

  constructor(connectionListener?: (socket: unknown) => void) {
    this.connectionListener = connectionListener
  }

  once(event: string, cb: (...args: never[]) => void): this {
    this.handlers.set(event, cb)
    return this
  }

  removeListener(event: string, cb: (...args: never[]) => void): this {
    if (this.handlers.get(event) === cb) {
      this.handlers.delete(event)
    }
    return this
  }

  listen(port: number, cb?: () => void): this {
    this.listening = true
    if (cb) cb()
    return this
  }

  close(cb?: (err?: Error) => void): this {
    this.listening = false
    if (cb) cb()
    return this
  }

  accept(socket: unknown): void {
    this.connectionListener?.(socket)
  }
}

class FakeNet implements ConnectionProbeNet {
  servers: FakeServer[] = []

  createServer(connectionListener?: (socket: unknown) => void): FakeServer {
    const server = new FakeServer(connectionListener)
    this.servers.push(server)
    return server
  }
}

describe('TcpConnectionProbe', () => {
  it('listens on a port and reports connections', async () => {
    const fakeNet = new FakeNet()
    const probe = new TcpConnectionProbe(fakeNet)
    const onConnection = () => {}

    await probe.listen('server-1', 25565, onConnection)

    expect(fakeNet.servers).toHaveLength(1)
    expect(fakeNet.servers[0].listening).toBe(true)
  })

  it('fires the onConnection callback when a socket connects', async () => {
    const fakeNet = new FakeNet()
    const probe = new TcpConnectionProbe(fakeNet)
    let fired = false

    await probe.listen('server-1', 25565, () => {
      fired = true
    })

    fakeNet.servers[0].accept({ destroy: () => {} })
    expect(fired).toBe(true)
  })

  it('closes an existing listener before re-listening the same server', async () => {
    const fakeNet = new FakeNet()
    const probe = new TcpConnectionProbe(fakeNet)

    await probe.listen('server-1', 25565, () => {})
    await probe.listen('server-1', 25566, () => {})

    expect(fakeNet.servers).toHaveLength(2)
    expect(fakeNet.servers[0].listening).toBe(false)
    expect(fakeNet.servers[1].listening).toBe(true)
  })

  it('closes a server listener', async () => {
    const fakeNet = new FakeNet()
    const probe = new TcpConnectionProbe(fakeNet)

    await probe.listen('server-1', 25565, () => {})
    await probe.close('server-1')

    expect(fakeNet.servers[0].listening).toBe(false)
  })

  it('accepts a real loopback connection', async () => {
    const port = await getFreePort()
    const probe = new TcpConnectionProbe()
    let fired = false
    const firedPromise = new Promise<void>((resolve) => {
      const original = () => {
        fired = true
        resolve()
      }
      void probe.listen('server-1', port, original)
    })

    await new Promise<void>((resolve) => {
      const socket = net.connect(port, '127.0.0.1', resolve)
      socket.on('error', () => resolve())
    })
    await firedPromise

    expect(fired).toBe(true)
    await probe.close('server-1')
  })
})

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo
      const port = address.port
      server.close(() => resolve(port))
    })
  })
}
