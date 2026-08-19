import { randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createGunzip, createGzip } from 'node:zlib'
import type { ArchiveStore, StoredArchive } from './archive.store'

export class LocalArchiveStore implements ArchiveStore {
  constructor(private readonly baseDir: string) {}

  async saveArchive(serverId: string, source: NodeJS.ReadableStream): Promise<StoredArchive> {
    const dir = join(this.baseDir, serverId)
    await mkdir(dir, { recursive: true })
    const key = `${serverId}/${randomUUID()}.tar.gz`
    const tempPath = join(this.baseDir, `${key}.tmp`)
    await pipeline(source, createGzip(), createWriteStream(tempPath))
    const finalPath = join(this.baseDir, key)
    await rename(tempPath, finalPath)
    const sizeBytes = (await stat(finalPath)).size
    return { key, sizeBytes }
  }

  async openArchive(key: string): Promise<NodeJS.ReadableStream> {
    return createReadStream(join(this.baseDir, key)).pipe(createGunzip())
  }

  async deleteArchive(key: string): Promise<void> {
    await rm(join(this.baseDir, key), { force: true })
  }
}
