import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import type { InstalledMod } from './installed-mod'
import { NotFoundError } from './integrations.errors'
import { IntegrationsModule } from './integrations.module'
import type { ModSearchResult } from './mod-provider'
import { MOD_INSTALLER_SERVICE, type ModInstallerService } from './mod-installer.service'

class FakeModInstallerService implements ModInstallerService {
  installed = new Map<string, InstalledMod>()

  async search(): Promise<ModSearchResult[]> {
    return [
      {
        projectId: 'A1',
        provider: 'modrinth',
        name: 'Sodium',
        type: 'mod',
        downloads: 1_000_000,
      },
    ]
  }

  async install(serverId: string, provider: string, projectId: string): Promise<InstalledMod> {
    const mod: InstalledMod = {
      id: 'inst-1',
      serverId,
      provider: provider as InstalledMod['provider'],
      projectId,
      projectName: 'Sodium',
      versionId: 'v1',
      fileName: 'sodium.jar',
      targetPath: 'mods/sodium.jar',
      installedAt: new Date(),
    }
    this.installed.set(mod.id, mod)
    return mod
  }

  async listInstalled(serverId: string): Promise<InstalledMod[]> {
    return [...this.installed.values()].filter((m) => m.serverId === serverId)
  }

  async uninstall(id: string): Promise<void> {
    if (!this.installed.has(id)) {
      throw new NotFoundError(`installed mod not found: ${id}`)
    }
    this.installed.delete(id)
  }
}

describe('IntegrationsController (HTTP)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [IntegrationsModule],
    })
      .overrideProvider(MOD_INSTALLER_SERVICE)
      .useValue(new FakeModInstallerService())
      .compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('searches mods on a provider', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/integrations/modrinth/search')
      .query({ query: 'sodium', type: 'mod', loader: 'fabric' })
      .expect(200)

    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ projectId: 'A1', provider: 'modrinth', name: 'Sodium' })
  })

  it('installs a mod on a server', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/servers/server-1/integrations/install')
      .send({ provider: 'modrinth', projectId: 'A1', type: 'mod' })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 'inst-1',
      serverId: 'server-1',
      provider: 'modrinth',
      targetPath: 'mods/sodium.jar',
    })
  })

  it('lists installed mods of a server', async () => {
    await request(app.getHttpServer())
      .post('/api/servers/server-1/integrations/install')
      .send({ provider: 'modrinth', projectId: 'A1' })
      .expect(201)

    const res = await request(app.getHttpServer())
      .get('/api/servers/server-1/integrations/installed')
      .expect(200)

    expect(res.body).toHaveLength(1)
    expect(res.body[0].projectId).toBe('A1')
  })

  it('uninstalls a mod with HTTP 204', async () => {
    await request(app.getHttpServer())
      .post('/api/servers/server-1/integrations/install')
      .send({ provider: 'modrinth', projectId: 'A1' })
      .expect(201)

    await request(app.getHttpServer()).delete('/api/integrations/installed/inst-1').expect(204)
  })

  it('returns 404 when uninstalling an unknown record', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/integrations/installed/missing')
      .expect(404)

    expect(res.body.error).toBe('NotFoundError')
  })
})
