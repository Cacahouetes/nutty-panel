export interface StoredTokens {
  accessToken: string
  refreshToken: string
}

const TOKEN_STORAGE_KEY = 'nutty-tokens'

export function getTokens(): StoredTokens | null {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTokens>
    if (typeof parsed.accessToken === 'string' && typeof parsed.refreshToken === 'string') {
      return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
    }
  } catch {
    return null
  }
  return null
}

export function setTokens(tokens: StoredTokens | null): void {
  if (tokens) {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.auth !== false) {
    const tokens = getTokens()
    if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`
  }
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (response.status === 401 && options.auth !== false) {
    setTokens(null)
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(payload?.message ?? `Request failed with ${response.status}`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}