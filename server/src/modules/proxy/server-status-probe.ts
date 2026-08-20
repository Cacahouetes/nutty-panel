import * as net from 'node:net'

export interface ServerStatusProbe {
  probe(host: string, port: number, timeoutMs?: number): Promise<boolean>
}

export const SERVER_STATUS_PROBE = Symbol('ServerStatusProbe')

export class TcpServerStatusProbe implements ServerStatusProbe {
  probe(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.connect({ host, port })
      const done = (result: boolean): void => {
        socket.destroy()
        resolve(result)
      }
      socket.once('connect', () => done(true))
      socket.once('error', () => done(false))
      socket.setTimeout(timeoutMs, () => done(false))
    })
  }
}
