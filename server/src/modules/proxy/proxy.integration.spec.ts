import { describe, it, expect, afterEach } from '@jest/globals'
import * as net from 'node:net'
import { createSmartProxy } from './smart-proxy'
import { createRouteResolver, type ProxyRoute } from './route-resolver'

const RESPONSE = Buffer.from([0x01, 0x00, 0xff])

function writeVarInt(value: number): Buffer {
  const bytes: number[] = []
  do {
    let current = value & 0x7f
    value >>>= 7
    if (value > 0) {
      current |= 0x80
    }
    bytes.push(current)
  } while (value > 0)
  return Buffer.from(bytes)
}

function buildHandshake(host: string, port: number, nextState = 1): Buffer {
  const payload = Buffer.concat([
    writeVarInt(0x00),
    writeVarInt(767),
    writeVarInt(Buffer.byteLength(host)),
    Buffer.from(host, 'utf8'),
    Buffer.from([(port >> 8) & 0xff, port & 0xff]),
    writeVarInt(nextState),
  ])
  return Buffer.concat([writeVarInt(payload.length), payload])
}

function listen(server: net.Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo
      resolve(address.port)
    })
  })
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo
      server.close(() => resolve(address.port))
    })
  })
}

async function connectAndSend(port: number, data: Buffer, timeoutMs = 2000): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const socket = net.connect({ host: '127.0.0.1', port })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error('timed out waiting for data'))
    }, timeoutMs)
    socket.on('data', (chunk) => {
      chunks.push(chunk)
      clearTimeout(timer)
      socket.destroy()
      resolve(chunks)
    })
    socket.on('error', reject)
    socket.write(data)
  })
}

describe('Smart Proxy (TCP integration)', () => {
  const proxies: ReturnType<typeof createSmartProxy>[] = []
  const backends: net.Server[] = []

  afterEach(async () => {
    for (const proxy of proxies) {
      await proxy.stop()
    }
    proxies.length = 0
    for (const server of backends) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
    backends.length = 0
  })

  async function startBackend(): Promise<{ port: number; received: Buffer[] }> {
    const received: Buffer[] = []
    const server = net.createServer((socket) => {
      socket.on('data', (chunk) => {
        received.push(chunk)
        socket.write(RESPONSE)
      })
    })
    backends.push(server)
    const port = await listen(server, 0)
    return { port, received }
  }

  it('routes a Minecraft handshake to the matching server and returns its response', async () => {
    const backend = await startBackend()
    const route: ProxyRoute = {
      serverId: 'lobby',
      name: 'Lobby',
      hostnames: ['lobby.play.example.com'],
      targetHost: '127.0.0.1',
      targetPort: backend.port,
      isDefault: true,
    }
    const proxy = createSmartProxy()
    proxies.push(proxy)
    const proxyPort = await getFreePort()
    await proxy.start({ resolver: createRouteResolver([route]), port: proxyPort })

    const handshake = buildHandshake('lobby.play.example.com', 25565)
    const chunks = await connectAndSend(proxyPort, handshake)

    expect(Buffer.concat(chunks).equals(RESPONSE)).toBe(true)
    expect(Buffer.concat(backend.received).equals(handshake)).toBe(true)
  })

  it('closes the connection for an unknown host', async () => {
    const backend = await startBackend()
    const route: ProxyRoute = {
      serverId: 'lobby',
      name: 'Lobby',
      hostnames: ['lobby.play.example.com'],
      targetHost: '127.0.0.1',
      targetPort: backend.port,
      isDefault: false,
    }
    const proxy = createSmartProxy()
    proxies.push(proxy)
    const proxyPort = await getFreePort()
    await proxy.start({ resolver: createRouteResolver([route]), port: proxyPort })

    const closed = new Promise<boolean>((resolve) => {
      const socket = net.connect({ host: '127.0.0.1', port: proxyPort })
      socket.on('close', () => resolve(true))
      socket.on('error', () => resolve(true))
      socket.write(buildHandshake('unknown.example.com', 25565))
    })

    await expect(closed).resolves.toBe(true)
    expect(backend.received).toHaveLength(0)
  })
})
