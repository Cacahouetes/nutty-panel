export interface WebhookHttpClient {
  post(url: string, body: string, headers: Record<string, string>): Promise<void>
}

export const WEBHOOK_HTTP_CLIENT = Symbol('WebhookHttpClient')

export class HttpWebhookClient implements WebhookHttpClient {
  constructor(private readonly timeoutMs = 10_000) {}

  async post(url: string, body: string, headers: Record<string, string>): Promise<void> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`webhook delivery failed with status ${response.status}`)
      }
    } finally {
      clearTimeout(timer)
    }
  }
}
