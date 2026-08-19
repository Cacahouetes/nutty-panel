import { describe, it, expect } from '@jest/globals'
import { Readable } from 'node:stream'
import { NotFoundError, ValidationError } from '../integrations.errors'
import type { HttpClient } from '../http-client'
import { CurseForgeProvider } from './curseforge.provider'

const BASE = 'https://curseforge.test/v1'

class FakeHttpClient implements HttpClient {
  getJsonResults = new Map<string, unknown>()
  getJsonHeaders = new Map<string, Record<string, string>>()

  async getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
    this.getJsonHeaders.set(url, headers)
    const result = this.getJsonResults.get(url)
    if (result === undefined) {
      throw new Error(`no fixture for ${url}`)
    }
    return result
  }

  async stream(url: string): Promise<NodeJS.ReadableStream> {
    return Readable.from([`content-of-${url}`])
  }
}

describe('CurseForgeProvider', () => {
  function build(http: HttpClient, apiKey?: string) {
    return new CurseForgeProvider({ http, baseUrl: BASE, apiKey })
  }

  it('throws ValidationError when no API key is configured', async () => {
    const provider = build(new FakeHttpClient())

    await expect(provider.search('sodium')).rejects.toBeInstanceOf(ValidationError)
    await expect(provider.getInstallation('1')).rejects.toBeInstanceOf(ValidationError)
  })

  it('maps search results and sends the API key header', async () => {
    const http = new FakeHttpClient()
    const url = `${BASE}/mods/search?gameId=432&searchFilter=sodium&classId=6`
    http.getJsonResults.set(url, {
      data: [{ id: 394468, name: 'Sodium', summary: 'Rendering', downloadCount: 42_000_000 }],
    })
    const provider = build(http, 'secret-key')

    const results = await provider.search('sodium', { type: 'mod' })

    expect(results).toEqual([
      {
        projectId: '394468',
        provider: 'curseforge',
        name: 'Sodium',
        description: 'Rendering',
        type: 'mod',
        downloads: 42_000_000,
      },
    ])
    expect(http.getJsonHeaders.get(url)?.['x-api-key']).toBe('secret-key')
  })

  it('resolves project metadata with the API key', async () => {
    const http = new FakeHttpClient()
    const url = `${BASE}/mods/394468`
    http.getJsonResults.set(url, {
      data: { name: 'Sodium', summary: 'Rendering' },
    })
    const provider = build(http, 'secret-key')

    const project = await provider.getProject('394468')

    expect(project).toEqual({
      projectId: '394468',
      name: 'Sodium',
      description: 'Rendering',
    })
    expect(http.getJsonHeaders.get(url)?.['x-api-key']).toBe('secret-key')
  })

  it('picks the newest file with a download URL and filters by version/loader', async () => {
    const http = new FakeHttpClient()
    const url = `${BASE}/mods/394468/files?gameVersion=1.20.4&modLoaderType=4`
    http.getJsonResults.set(url, {
      data: [
        {
          id: 5,
          fileName: 'sodium-0.6.jar',
          downloadUrl: 'https://cdn/sodium.jar',
          fileDate: '2024-01-01T00:00:00Z',
        },
        {
          id: 4,
          fileName: 'sodium-0.5.jar',
          downloadUrl: null,
          fileDate: '2023-01-01T00:00:00Z',
        },
      ],
    })
    const provider = build(http, 'secret-key')

    const installation = await provider.getInstallation('394468', {
      gameVersion: '1.20.4',
      loader: 'fabric',
    })

    expect(installation).toEqual({
      versionId: '5',
      fileName: 'sodium-0.6.jar',
      downloadUrl: 'https://cdn/sodium.jar',
    })
  })

  it('throws NotFoundError when no downloadable file exists', async () => {
    const http = new FakeHttpClient()
    http.getJsonResults.set(`${BASE}/mods/394468/files`, { data: [] })
    const provider = build(http, 'secret-key')

    await expect(provider.getInstallation('394468')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('downloads the file as a stream without an API key on the CDN', async () => {
    const http = new FakeHttpClient()
    const provider = build(http, 'secret-key')

    const stream = await provider.download({
      versionId: '5',
      fileName: 'sodium.jar',
      downloadUrl: 'https://cdn/sodium.jar',
    })

    const chunks: Buffer[] = []
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk))
    }
    expect(Buffer.concat(chunks).toString()).toBe('content-of-https://cdn/sodium.jar')
  })
})
