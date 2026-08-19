import { describe, it, expect } from '@jest/globals'
import { Readable } from 'node:stream'
import { NotFoundError } from '../integrations.errors'
import type { HttpClient } from '../http-client'
import { ModrinthProvider } from './modrinth.provider'

class FakeHttpClient implements HttpClient {
  getJsonResults = new Map<string, unknown>()

  constructor() {}

  async getJson(url: string): Promise<unknown> {
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

const BASE = 'https://modrinth.test/v2'

describe('ModrinthProvider', () => {
  function build(http: HttpClient) {
    return new ModrinthProvider({ http, baseUrl: BASE })
  }

  it('maps search hits to ModSearchResult', async () => {
    const http = new FakeHttpClient()
    http.getJsonResults.set(
      `${BASE}/search?query=sodium&facets=${encodeURIComponent(
        JSON.stringify([['project_type:mod'], ['categories:fabric'], ['versions:1.20.4']]),
      )}`,
      {
        hits: [
          {
            project_id: 'A1',
            title: 'Sodium',
            description: 'Rendering engine',
            project_type: 'mod',
            downloads: 1_000_000,
          },
        ],
      },
    )
    const provider = build(http)

    const results = await provider.search('sodium', {
      type: 'mod',
      loader: 'fabric',
      gameVersion: '1.20.4',
    })

    expect(results).toEqual([
      {
        projectId: 'A1',
        provider: 'modrinth',
        name: 'Sodium',
        description: 'Rendering engine',
        type: 'mod',
        downloads: 1_000_000,
      },
    ])
  })

  it('returns an empty list for no hits', async () => {
    const http = new FakeHttpClient()
    http.getJsonResults.set(`${BASE}/search?query=nothing`, { hits: [] })
    const provider = build(http)

    const results = await provider.search('nothing')

    expect(results).toEqual([])
  })

  it('resolves project metadata', async () => {
    const http = new FakeHttpClient()
    http.getJsonResults.set(`${BASE}/project/A1`, {
      title: 'Sodium',
      description: 'Rendering engine',
    })
    const provider = build(http)

    const project = await provider.getProject('A1')

    expect(project).toEqual({
      projectId: 'A1',
      name: 'Sodium',
      description: 'Rendering engine',
    })
  })

  it('resolves the newest compatible version', async () => {
    const http = new FakeHttpClient()
    http.getJsonResults.set(
      `${BASE}/project/A1/version?game_versions=${encodeURIComponent(
        JSON.stringify(['1.20.4']),
      )}&loaders=${encodeURIComponent(JSON.stringify(['fabric']))}`,
      [
        {
          id: 'v2',
          files: [{ url: 'https://cdn/v2.jar', filename: 'sodium-2.jar' }],
        },
        {
          id: 'v1',
          files: [{ url: 'https://cdn/v1.jar', filename: 'sodium-1.jar' }],
        },
      ],
    )
    const provider = build(http)

    const installation = await provider.getInstallation('A1', {
      gameVersion: '1.20.4',
      loader: 'fabric',
    })

    expect(installation).toEqual({
      versionId: 'v2',
      fileName: 'sodium-2.jar',
      downloadUrl: 'https://cdn/v2.jar',
    })
  })

  it('throws NotFoundError when no compatible version exists', async () => {
    const http = new FakeHttpClient()
    http.getJsonResults.set(`${BASE}/project/A1/version`, [])
    const provider = build(http)

    await expect(provider.getInstallation('A1')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('downloads the file as a stream', async () => {
    const http = new FakeHttpClient()
    const provider = build(http)

    const stream = await provider.download({
      versionId: 'v1',
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
