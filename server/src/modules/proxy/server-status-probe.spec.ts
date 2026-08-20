import { describe, it, expect, afterEach } from '@jest/globals'
import * as net from 'node:net'
import { TcpServerStatusProbe } from './server-status-probe'

const servers: net.Server[] = []

afterEach(async () => {
  for (const server of servers) {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  servers.length = 0
})

function startListener(): Promise<{ host: string; port: number }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    servers.push(server)
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo
      resolve({ host: '127.0.0.1', port: address.port })
    })
  })
}

describe('TcpServerStatusProbe', () => {
  it('reports online for a reachable port', async () => {
    const { host, port } = await startListener()
    const probe = new TcpServerStatusProbe()

    await expect(probe.probe(host, port)).resolves.toBe(true)
  })

  it('reports offline for an unused port', async () => {
    const probe = new TcpServerStatusProbe()
    const { port } = await startListener()
    await new Promise<void>((resolve) => servers[0].close(() => resolve()))

    await expect(probe.probe('127.0.0.1', port, 500)).resolves.toBe(false)
  })
})
