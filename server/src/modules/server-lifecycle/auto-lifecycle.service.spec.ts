import { describe, it, expect } from '@jest/globals'
import { NotFoundError as ServersNotFoundError } from '../servers/servers.service'
import type { ServerInstance } from '../servers/server-instance'
import type { AutoStartPolicy } from './auto-start-policy'
import type { AutoStartPolicyStore } from './auto-start-policy.store'
import type { ConnectionProbe } from './connection.probe'
import { createAutoLifecycleService } from './auto-lifecycle.service'
import { AutoLifecycleNotFoundError, AutoLifecycleValidationError } from './auto-lifecycle.errors'

class FakePolicyStore implements AutoStartPolicyStore {
  policies = new Map<string, AutoStartPolicy>()

  async get(serverId: string): Promise<AutoStartPolicy | undefined> {
    return this.policies.get(serverId)
  }

  async list(): Promise<AutoStartPolicy[]> {
    return [...this.policies.values()]
  }

  async set(policy: AutoStartPolicy): Promise<AutoStartPolicy> {
    this.policies.set(policy.serverId, { ...policy })
    return { ...policy }
  }
}

class FakeProbe implements ConnectionProbe {
  listeners = new Map<string, { port: number; onConnection: () => void }>()
  closed: string[] = []
  failNextListen = false

  async listen(serverId: string, port: number, onConnection: () => void): Promise<void> {
    if (this.failNextListen) {
      this.failNextListen = false
      throw new Error('EADDRINUSE')
    }
    this.listeners.set(serverId, { port, onConnection })
  }

  async close(serverId: string): Promise<void> {
    this.closed.push(serverId)
    this.listeners.delete(serverId)
  }
}

class FakeServers {
  servers = new Map<string, ServerInstance>()
  startCalls: string[] = []
  stopCalls: string[] = []

  async findOne(id: string): Promise<ServerInstance> {
    const server = this.servers.get(id)
    if (!server) throw new ServersNotFoundError(`server not found: ${id}`)
    return server
  }

  async start(id: string): Promise<ServerInstance> {
    this.startCalls.push(id)
    const server = this.servers.get(id)
    if (server) server.status = 'running'
    return server as ServerInstance
  }

  async stop(id: string): Promise<ServerInstance> {
    this.stopCalls.push(id)
    const server = this.servers.get(id)
    if (server) server.status = 'stopped'
    return server as ServerInstance
  }
}

function makeServer(id: string, status: ServerInstance['status']): ServerInstance {
  return {
    id,
    name: id,
    type: 'paper',
    version: '1.20.4',
    port: 25565,
    memoryMb: 2048,
    cpuPercent: 100,
    status,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }
}

function build() {
  const policies = new FakePolicyStore()
  const servers = new FakeServers()
  const probe = new FakeProbe()
  const service = createAutoLifecycleService({ policies, servers, probe })
  return { policies, servers, probe, service }
}

describe('AutoLifecycleService', () => {
  describe('getPolicy', () => {
    it('returns a default disabled policy for a server without one', async () => {
      const { servers, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'stopped'))

      await expect(service.getPolicy('server-1')).resolves.toEqual({
        serverId: 'server-1',
        enabled: false,
        inactiveMinutes: 30,
      })
    })

    it('returns the stored policy when present', async () => {
      const { policies, servers, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'running'))
      await policies.set({ serverId: 'server-1', enabled: true, inactiveMinutes: 10 })

      const policy = await service.getPolicy('server-1')
      expect(policy).toMatchObject({ enabled: true, inactiveMinutes: 10 })
    })

    it('throws AutoLifecycleNotFoundError for an unknown server', async () => {
      await expect(build().service.getPolicy('missing')).rejects.toThrow(AutoLifecycleNotFoundError)
    })
  })

  describe('setPolicy', () => {
    it('enables the policy and opens the probe for a stopped server', async () => {
      const { servers, probe, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'stopped'))

      const policy = await service.setPolicy('server-1', { enabled: true, inactiveMinutes: 10 })

      expect(policy).toMatchObject({ serverId: 'server-1', enabled: true, inactiveMinutes: 10 })
      expect(probe.listeners.get('server-1')).toMatchObject({ port: 25565 })
    })

    it('disables the policy and closes the probe', async () => {
      const { servers, policies, probe, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'stopped'))
      await policies.set({ serverId: 'server-1', enabled: true, inactiveMinutes: 30 })
      await service.setPolicy('server-1', { enabled: true })
      expect(probe.listeners.has('server-1')).toBe(true)

      await service.setPolicy('server-1', { enabled: false })

      expect(probe.listeners.has('server-1')).toBe(false)
      expect(probe.closed).toContain('server-1')
    })

    it('does not open the probe while the server is running', async () => {
      const { servers, probe, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'running'))

      await service.setPolicy('server-1', { enabled: true, inactiveMinutes: 10 })

      expect(probe.listeners.has('server-1')).toBe(false)
    })

    it('validates inactiveMinutes is at least 1', async () => {
      const { servers, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'stopped'))

      await expect(service.setPolicy('server-1', { inactiveMinutes: 0 })).rejects.toThrow(
        AutoLifecycleValidationError,
      )
    })

    it('rejects an unknown server with AutoLifecycleNotFoundError', async () => {
      await expect(build().service.setPolicy('missing', { enabled: true })).rejects.toThrow(
        AutoLifecycleNotFoundError,
      )
    })
  })

  describe('handleConnection', () => {
    it('starts a stopped server and closes the probe first', async () => {
      const { servers, policies, probe, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'stopped'))
      await policies.set({ serverId: 'server-1', enabled: true, inactiveMinutes: 30 })
      await probe.listen('server-1', 25565, () => {})

      await service.handleConnection('server-1')

      expect(probe.closed).toContain('server-1')
      expect(probe.listeners.has('server-1')).toBe(false)
      expect(servers.startCalls).toEqual(['server-1'])
    })

    it('refreshes lastActivityAt without starting a running server', async () => {
      const { servers, policies, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'running'))
      await policies.set({ serverId: 'server-1', enabled: true, inactiveMinutes: 30 })

      await service.handleConnection('server-1')

      const policy = await policies.get('server-1')
      expect(policy?.lastActivityAt).toBeDefined()
      expect(servers.startCalls).toEqual([])
    })

    it('ignores servers without an enabled policy', async () => {
      const { servers, probe, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'stopped'))

      await service.handleConnection('server-1')

      expect(servers.startCalls).toEqual([])
      expect(probe.listeners.has('server-1')).toBe(false)
    })
  })

  describe('runDue', () => {
    it('stops a running server idle beyond inactiveMinutes and reopens the probe', async () => {
      const { servers, policies, probe, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'running'))
      await policies.set({
        serverId: 'server-1',
        enabled: true,
        inactiveMinutes: 5,
        lastActivityAt: new Date('2026-01-01T00:00:00Z'),
      })

      const stopped = await service.runDue(new Date('2026-01-01T00:10:00Z'))

      expect(stopped).toEqual(['server-1'])
      expect(servers.stopCalls).toEqual(['server-1'])
      expect(probe.listeners.get('server-1')).toMatchObject({ port: 25565 })
    })

    it('does not stop a recently active server', async () => {
      const { servers, policies, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'running'))
      await policies.set({
        serverId: 'server-1',
        enabled: true,
        inactiveMinutes: 5,
        lastActivityAt: new Date('2026-01-01T00:08:00Z'),
      })

      const stopped = await service.runDue(new Date('2026-01-01T00:10:00Z'))

      expect(stopped).toEqual([])
      expect(servers.stopCalls).toEqual([])
    })

    it('opens the probe for a stopped server with an enabled policy', async () => {
      const { servers, policies, probe, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'stopped'))
      await policies.set({ serverId: 'server-1', enabled: true, inactiveMinutes: 30 })

      await service.runDue()

      expect(probe.listeners.get('server-1')).toMatchObject({ port: 25565 })
    })

    it('treats a missing lastActivityAt as the server updatedAt', async () => {
      const { servers, policies, service } = build()
      const server = makeServer('server-1', 'running')
      server.updatedAt = new Date('2026-01-01T00:00:00Z')
      servers.servers.set('server-1', server)
      await policies.set({ serverId: 'server-1', enabled: true, inactiveMinutes: 5 })

      const stopped = await service.runDue(new Date('2026-01-01T00:10:00Z'))

      expect(stopped).toEqual(['server-1'])
    })

    it('skips servers without a policy and deleted servers', async () => {
      const { servers, policies, service } = build()
      servers.servers.set('server-1', makeServer('server-1', 'running'))
      await policies.set({ serverId: 'deleted', enabled: true, inactiveMinutes: 1 })

      const stopped = await service.runDue()

      expect(stopped).toEqual([])
    })
  })
})
