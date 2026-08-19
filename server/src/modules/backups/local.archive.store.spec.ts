import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { LocalArchiveStore } from './local.archive.store'

async function collect(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

describe('LocalArchiveStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nutty-backups-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('stores a gzipped archive per server and reports its size', async () => {
    const store = new LocalArchiveStore(dir)

    const stored = await store.saveArchive('server-1', Readable.from(['hello world']))

    expect(stored.sizeBytes).toBeGreaterThan(0)
    const files = await readdir(join(dir, 'server-1'))
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/\.tar\.gz$/)
  })

  it('returns the decompressed content when opening an archive', async () => {
    const store = new LocalArchiveStore(dir)
    const stored = await store.saveArchive('server-1', Readable.from(['backup payload']))

    const stream = await store.openArchive(stored.key)

    expect((await collect(stream)).toString()).toBe('backup payload')
  })

  it('deletes an archive', async () => {
    const store = new LocalArchiveStore(dir)
    const stored = await store.saveArchive('server-1', Readable.from(['x']))

    await store.deleteArchive(stored.key)

    const files = await readdir(join(dir, 'server-1'))
    expect(files).toHaveLength(0)
  })
})
