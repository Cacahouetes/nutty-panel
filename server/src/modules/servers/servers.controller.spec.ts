import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import type { ServerInstance } from './server-instance'
import { SERVER_PROCESS_MANAGER, type ServerProcessManager } from './server-process.manager'
import { ServersModule } from './servers.module'

class InMemoryProcessManager implements ServerProcessManager {
  private readonly running = new Set<string>()

  async start(instance: ServerInstance): Promise<void> {
    this.running.add(instance.id)
  }

  async stop(instance: ServerInstance): Promise<void> {
    this.running.delete(instance.id)
  }

  async kill(instance: ServerInstance): Promise<void> {
    this.running.delete(instance.id)
  }
}

describe('ServersController (HTTP)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ServersModule],
    })
      .overrideProvider(SERVER_PROCESS_MANAGER)
      .useValue(new InMemoryProcessManager())
      .compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  const validBody = {
    name: 'Survival',
    type: 'vanilla',
    version: '1.20.4',
    port: 25565,
  }

  it('creates a server with HTTP 201', async () => {
    const res = await request(app.getHttpServer()).post('/api/servers').send(validBody).expect(201)

    expect(res.body.id).toBeTruthy()
    expect(res.body.status).toBe('stopped')
    expect(res.body.memoryMb).toBe(2048)
  })

  it('rejects an invalid server type with HTTP 400', async () => {
    await request(app.getHttpServer())
      .post('/api/servers')
      .send({ ...validBody, type: 'garbage' })
      .expect(400)
  })

  it('rejects a duplicate port with HTTP 409', async () => {
    await request(app.getHttpServer()).post('/api/servers').send(validBody).expect(201)
    await request(app.getHttpServer())
      .post('/api/servers')
      .send({ ...validBody, name: 'Second' })
      .expect(409)
  })

  it('returns a missing server with HTTP 404', async () => {
    await request(app.getHttpServer()).get('/api/servers/missing').expect(404)
  })

  it('lists servers', async () => {
    await request(app.getHttpServer()).post('/api/servers').send(validBody)
    const res = await request(app.getHttpServer()).get('/api/servers').expect(200)

    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Survival')
  })

  it('starts a server then rejects a second start with HTTP 409', async () => {
    const created = await request(app.getHttpServer()).post('/api/servers').send(validBody)

    const started = await request(app.getHttpServer())
      .post(`/api/servers/${created.body.id}/start`)
      .expect(201)
    expect(started.body.status).toBe('running')

    await request(app.getHttpServer()).post(`/api/servers/${created.body.id}/start`).expect(409)
  })

  it('stops a running server', async () => {
    const created = await request(app.getHttpServer()).post('/api/servers').send(validBody)
    await request(app.getHttpServer()).post(`/api/servers/${created.body.id}/start`)

    const stopped = await request(app.getHttpServer())
      .post(`/api/servers/${created.body.id}/stop`)
      .expect(201)
    expect(stopped.body.status).toBe('stopped')
  })

  it('updates a server', async () => {
    const created = await request(app.getHttpServer()).post('/api/servers').send(validBody)

    const updated = await request(app.getHttpServer())
      .patch(`/api/servers/${created.body.id}`)
      .send({ name: 'Renamed', memoryMb: 4096 })
      .expect(200)

    expect(updated.body.name).toBe('Renamed')
    expect(updated.body.memoryMb).toBe(4096)
  })

  it('removes a server with HTTP 204', async () => {
    const created = await request(app.getHttpServer()).post('/api/servers').send(validBody)

    await request(app.getHttpServer()).delete(`/api/servers/${created.body.id}`).expect(204)

    await request(app.getHttpServer())
      .get('/api/servers')
      .expect(200)
      .expect((res) => expect(res.body).toHaveLength(0))
  })

  it('rejects stopping a stopped server with HTTP 409', async () => {
    const created = await request(app.getHttpServer()).post('/api/servers').send(validBody)

    await request(app.getHttpServer()).post(`/api/servers/${created.body.id}/stop`).expect(409)
  })
})
