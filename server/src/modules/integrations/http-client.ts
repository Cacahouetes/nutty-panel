import { Readable } from 'node:stream'

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export interface HttpClient {
  getJson(url: string, headers?: Record<string, string>): Promise<unknown>
  stream(url: string, headers?: Record<string, string>): Promise<NodeJS.ReadableStream>
}

export const HTTP_CLIENT = Symbol('HttpClient')

export function createNodeHttpClient(fetchImpl: typeof globalThis.fetch = fetch): HttpClient {
  return new NodeHttpClient(fetchImpl)
}

class NodeHttpClient implements HttpClient {
  constructor(private readonly fetchImpl: typeof globalThis.fetch) {}

  async getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
    const res = await this.fetchImpl(url, { headers })
    if (!res.ok) {
      throw new HttpError(res.status, `GET ${url} failed with ${res.status}`)
    }
    return (await res.json()) as unknown
  }

  async stream(url: string, headers: Record<string, string> = {}): Promise<NodeJS.ReadableStream> {
    const res = await this.fetchImpl(url, { headers })
    if (!res.ok) {
      throw new HttpError(res.status, `GET ${url} failed with ${res.status}`)
    }
    return Readable.fromWeb(res.body as unknown as import('node:stream/web').ReadableStream)
  }
}
