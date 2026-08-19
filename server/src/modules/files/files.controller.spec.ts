import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Readable } from 'node:stream'
import request from 'supertest'
import { FILES_SERVICE, NotFoundError, type FilesService } from './files.service'
import { FilesModule } from './files.module'
import type { FileEntry } from './server-file-access'

class FakeFilesService implements FilesService {
  files = new Map<string, string>([['server-1/server.properties', 'motd=Hello']])

  async list(serverId: string, path: string): Promise<FileEntry[]> {
    return [
      { name: 'world', path: path ? `${path}/world` : 'world', type: 'directory' },
      {
        name: 'server.properties',
        path: path ? `${path}/server.properties` : 'server.properties',
        type: 'file',
        sizeBytes: 10,
      },
    ]
  }

  async readText(serverId: string, path: string): Promise<string> {
    const content = this.files.get(`${serverId}/${path}`)
    if (content === undefined) {
      throw new NotFoundError(`file not found: ${path}`)
    }
    return content
  }

  async writeText(serverId: string, path: string, content: string): Promise<void> {
    this.files.set(`${serverId}/${path}`, content)
  }

  async createDirectory(): Promise<void> {}
  async remove(): Promise<void> {}
  async rename(): Promise<void> {}
  async upload(): Promise<void> {}

  async download(serverId: string, path: string): Promise<NodeJS.ReadableStream> {
    if (!this.files.has(`${serverId}/${path}`)) {
      throw new NotFoundError(`file not found: ${path}`)
    }
    return Readable.from([this.files.get(`${serverId}/${path}`) as string])
  }
}

describe('FilesController (HTTP)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [FilesModule],
    })
      .overrideProvider(FILES_SERVICE)
      .useValue(new FakeFilesService())
      .compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('lists files of a server directory', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/servers/server-1/files')
      .query({ path: 'world' })
      .expect(200)

    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({ name: 'world', type: 'directory' })
  })

  it('reads a text file', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/servers/server-1/files/content')
      .query({ path: 'server.properties' })
      .expect(200)

    expect(res.text).toBe('motd=Hello')
  })

  it('returns 404 when reading a missing file', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/servers/server-1/files/content')
      .query({ path: 'missing.txt' })
      .expect(404)

    expect(res.body.error).toBe('NotFoundError')
  })

  it('writes a text file', async () => {
    await request(app.getHttpServer())
      .put('/api/servers/server-1/files/content')
      .query({ path: 'server.properties' })
      .send({ content: 'motd=New' })
      .expect(200)
  })

  it('creates a directory', async () => {
    await request(app.getHttpServer())
      .post('/api/servers/server-1/files/directories')
      .send({ path: 'plugins' })
      .expect(201)
  })

  it('renames a file', async () => {
    await request(app.getHttpServer())
      .patch('/api/servers/server-1/files')
      .send({ from: 'old.txt', to: 'new.txt' })
      .expect(200)
  })

  it('removes a file with HTTP 204', async () => {
    await request(app.getHttpServer())
      .delete('/api/servers/server-1/files')
      .query({ path: 'world' })
      .expect(204)
  })

  it('uploads a file via multipart', async () => {
    await request(app.getHttpServer())
      .post('/api/servers/server-1/files/upload')
      .query({ path: 'mods.jar' })
      .attach('file', Buffer.from('binary'), 'mods.jar')
      .expect(201)
  })

  it('downloads a file as a stream', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/servers/server-1/files/download')
      .query({ path: 'server.properties' })
      .expect(200)

    expect(res.text).toBe('motd=Hello')
  })
})
