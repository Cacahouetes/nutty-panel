import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Readable } from 'node:stream'
import request from 'supertest'
import { ARCHIVE_STORE, type ArchiveStore } from './archive.store'
import { BackupsModule } from './backups.module'
import { SERVER_DATA_ACCESS, type ServerDataAccess } from './server-data'

class FakeArchiveStore implements ArchiveStore {
  archives = new Map<string, Buffer>()
  private nextKey = 1

  async saveArchive(serverId: string, source: NodeJS.ReadableStream) {
    const chunks: Buffer[] = []
    for await (const chunk of source as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk))
    }
    const content = Buffer.concat(chunks)
    const key = `archive-${this.nextKey++}`
    this.archives.set(key, content)
    return { key, sizeBytes: content.length }
  }

  async openArchive(key: string): Promise<NodeJS.ReadableStream> {
    return Readable.from(this.archives.get(key) ?? [])
  }

  async deleteArchive(key: string): Promise<void> {
    this.archives.delete(key)
  }
}

class FakeServerData implements ServerDataAccess {
  imported: string[] = []

  async exportData(serverId: string): Promise<NodeJS.ReadableStream> {
    return Readable.from([`data-${serverId}`])
  }

  async importData(serverId: string, stream: NodeJS.ReadableStream): Promise<void> {
    const chunks: Buffer[] = []
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk))
    }
    this.imported.push(Buffer.concat(chunks).toString())
  }
}

describe('BackupsController (HTTP)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [BackupsModule],
    })
      .overrideProvider(SERVER_DATA_ACCESS)
      .useValue(new FakeServerData())
      .overrideProvider(ARCHIVE_STORE)
      .useValue(new FakeArchiveStore())
      .compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('creates a manual backup with HTTP 201', async () => {
    const res = await request(app.getHttpServer()).post('/api/servers/server-1/backups').expect(201)

    expect(res.body.serverId).toBe('server-1')
    expect(res.body.sizeBytes).toBe('data-server-1'.length)
    expect(res.body.archiveKey).toBeDefined()
  })

  it('lists backups of a server', async () => {
    await request(app.getHttpServer()).post('/api/servers/server-1/backups').expect(201)
    await request(app.getHttpServer()).post('/api/servers/server-1/backups').expect(201)

    const res = await request(app.getHttpServer()).get('/api/servers/server-1/backups').expect(200)

    expect(res.body).toHaveLength(2)
  })

  it('restores a backup with HTTP 204', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/servers/server-1/backups')
      .expect(201)

    await request(app.getHttpServer()).post(`/api/backups/${created.body.id}/restore`).expect(204)
  })

  it('rejects restoring an unknown backup with HTTP 404', async () => {
    const res = await request(app.getHttpServer()).post('/api/backups/missing/restore').expect(404)

    expect(res.body.error).toBe('NotFoundError')
  })

  it('deletes a backup with HTTP 204', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/servers/server-1/backups')
      .expect(201)

    await request(app.getHttpServer()).delete(`/api/backups/${created.body.id}`).expect(204)

    const res = await request(app.getHttpServer()).get('/api/servers/server-1/backups').expect(200)
    expect(res.body).toHaveLength(0)
  })

  it('sets and reads a backup policy per server', async () => {
    const set = await request(app.getHttpServer())
      .patch('/api/servers/server-1/backup-policy')
      .send({ intervalMinutes: 120, maxBackups: 3 })
      .expect(200)

    expect(set.body).toEqual({ serverId: 'server-1', intervalMinutes: 120, maxBackups: 3 })

    const get = await request(app.getHttpServer())
      .get('/api/servers/server-1/backup-policy')
      .expect(200)

    expect(get.body).toEqual({ serverId: 'server-1', intervalMinutes: 120, maxBackups: 3 })
  })

  it('rejects an invalid backup policy with HTTP 400', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/servers/server-1/backup-policy')
      .send({ intervalMinutes: 0 })
      .expect(400)

    expect(res.body.error).toBe('ValidationError')
  })
})
