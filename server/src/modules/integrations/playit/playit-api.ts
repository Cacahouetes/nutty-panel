export class PlayitAuthError extends Error {
  constructor(message = 'playit authentication failed') {
    super(message)
    this.name = 'PlayitAuthError'
  }
}

export class PlayitRateLimitError extends Error {
  constructor(message = 'playit rate limit exceeded') {
    super(message)
    this.name = 'PlayitRateLimitError'
  }
}

export class PlayitNotFoundError extends Error {
  constructor(message = 'playit resource not found') {
    super(message)
    this.name = 'PlayitNotFoundError'
  }
}

export class PlayitApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'PlayitApiError'
    this.status = status
  }
}

export interface PlayitCreateTunnelInput {
  name: string
  portType: 'tcp'
  localAddress: string
}

export interface PlayitTunnelRef {
  tunnelId: string
  host: string
  port: number
}

export interface PlayitApi {
  createTunnel(input: PlayitCreateTunnelInput): Promise<PlayitTunnelRef>
  listTunnels(): Promise<PlayitTunnelRef[]>
  deleteTunnel(tunnelId: string): Promise<void>
}

export const PLAYIT_API = Symbol('PlayitApi')

export interface HttpPlayitApiDeps {
  baseUrl: string
  apiKey?: string
  fetchImpl?: typeof fetch
}

export class HttpPlayitApi implements PlayitApi {
  private readonly baseUrl: string
  private readonly apiKey?: string
  private readonly fetchImpl: typeof fetch

  constructor(deps: HttpPlayitApiDeps) {
    this.baseUrl = deps.baseUrl.replace(/\/$/, '')
    this.apiKey = deps.apiKey
    this.fetchImpl = deps.fetchImpl ?? fetch
  }

  async createTunnel(input: PlayitCreateTunnelInput): Promise<PlayitTunnelRef> {
    const body = await this.post('/tunnels/create', {
      name: input.name,
      port_type: input.portType,
      local_address: input.localAddress,
    })
    const data = extractData(body)
    return {
      tunnelId: readTunnelId(data),
      host: readAllocationHost(data),
      port: readAllocationPort(data),
    }
  }

  async listTunnels(): Promise<PlayitTunnelRef[]> {
    const body = await this.post('/tunnels/list', {})
    const data = extractData(body)
    const items = readArray(data, ['tunnels'])
    return items.map((item) => ({
      tunnelId: readTunnelId(item),
      host: readAllocationHost(item),
      port: readAllocationPort(item),
    }))
  }

  async deleteTunnel(tunnelId: string): Promise<void> {
    try {
      await this.post('/tunnels/delete', { tunnel_id: tunnelId })
    } catch (err) {
      if (err instanceof PlayitNotFoundError) {
        return
      }
      throw err
    }
  }

  private async post(path: string, payload: unknown): Promise<unknown> {
    if (!this.apiKey) {
      throw new PlayitAuthError('PLAYIT_API_KEY is not configured')
    }
    let response: Response
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      })
    } catch {
      throw new PlayitApiError(0, `playit request to ${path} failed`)
    }
    if (response.status === 401 || response.status === 403) {
      throw new PlayitAuthError()
    }
    if (response.status === 429) {
      throw new PlayitRateLimitError()
    }
    if (response.status === 404) {
      throw new PlayitNotFoundError()
    }
    if (!response.ok) {
      throw new PlayitApiError(
        response.status,
        `playit request to ${path} failed with ${response.status}`,
      )
    }
    try {
      return (await response.json()) as unknown
    } catch {
      return {}
    }
  }
}

function extractData(body: unknown): Record<string, unknown> {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    if (record.data && typeof record.data === 'object') {
      return record.data as Record<string, unknown>
    }
    return record
  }
  return {}
}

function readArray(data: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = data[key]
    if (Array.isArray(value)) {
      return value
    }
  }
  return []
}

function readTunnelId(item: unknown): string {
  const record = toRecord(item) ?? {}
  return (
    asString(record.tunnel_id) ??
    asString(record['tunnel.id']) ??
    asString(record.tunnelId) ??
    asString(toRecord(record.tunnel)?.id) ??
    ''
  )
}

function readAllocationHost(item: unknown): string {
  const record = toRecord(item) ?? {}
  const allocation = toRecord(record.allocation) ?? toRecord(toRecord(record.tunnel)?.allocation)
  return asString(allocation?.ip) ?? asString(allocation?.host) ?? asString(record.host) ?? ''
}

function readAllocationPort(item: unknown): number {
  const record = toRecord(item) ?? {}
  const allocation = toRecord(record.allocation) ?? toRecord(toRecord(record.tunnel)?.allocation)
  const port = allocation?.port ?? record.port
  return typeof port === 'number' ? port : Number(asString(port)) || 0
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
