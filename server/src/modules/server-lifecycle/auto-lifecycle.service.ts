import {
  NotFoundError as ServersNotFoundError,
  type ServersService,
} from '../servers/servers.service'
import {
  DEFAULT_INACTIVE_MINUTES,
  MIN_INACTIVE_MINUTES,
  type AutoStartPolicy,
  type SetAutoStartInput,
} from './auto-start-policy'
import type { AutoStartPolicyStore } from './auto-start-policy.store'
import type { ConnectionProbe } from './connection.probe'
import { AutoLifecycleNotFoundError, AutoLifecycleValidationError } from './auto-lifecycle.errors'

export interface AutoLifecycleServiceDeps {
  policies: AutoStartPolicyStore
  servers: Pick<ServersService, 'findOne' | 'start' | 'stop'>
  probe: ConnectionProbe
}

export interface AutoLifecycleService {
  getPolicy(serverId: string): Promise<AutoStartPolicy>
  setPolicy(serverId: string, input: SetAutoStartInput): Promise<AutoStartPolicy>
  handleConnection(serverId: string): Promise<void>
  runDue(now?: Date): Promise<string[]>
}

export const AUTO_LIFECYCLE_SERVICE = Symbol('AutoLifecycleService')

export function createAutoLifecycleService(deps: AutoLifecycleServiceDeps): AutoLifecycleService {
  return new DefaultAutoLifecycleService(deps)
}

class DefaultAutoLifecycleService implements AutoLifecycleService {
  constructor(private readonly deps: AutoLifecycleServiceDeps) {}

  async getPolicy(serverId: string): Promise<AutoStartPolicy> {
    await this.mustFindServer(serverId)
    const existing = await this.deps.policies.get(serverId)
    return (
      existing ?? {
        serverId,
        enabled: false,
        inactiveMinutes: DEFAULT_INACTIVE_MINUTES,
      }
    )
  }

  async setPolicy(serverId: string, input: SetAutoStartInput): Promise<AutoStartPolicy> {
    await this.mustFindServer(serverId)
    if (
      input.inactiveMinutes !== undefined &&
      (!Number.isInteger(input.inactiveMinutes) || input.inactiveMinutes < MIN_INACTIVE_MINUTES)
    ) {
      throw new AutoLifecycleValidationError(
        `inactiveMinutes must be an integer of at least ${MIN_INACTIVE_MINUTES}`,
      )
    }
    const existing = await this.deps.policies.get(serverId)
    const policy: AutoStartPolicy = {
      serverId,
      enabled: input.enabled ?? existing?.enabled ?? false,
      inactiveMinutes:
        input.inactiveMinutes ?? existing?.inactiveMinutes ?? DEFAULT_INACTIVE_MINUTES,
      lastActivityAt: existing?.lastActivityAt ?? new Date(),
    }
    const saved = await this.deps.policies.set(policy)
    const server = await this.deps.servers.findOne(serverId)
    if (saved.enabled) {
      if (server.status === 'stopped' || server.status === 'error') {
        await this.listenProbe(serverId, server.port)
      }
    } else {
      await this.deps.probe.close(serverId)
    }
    return saved
  }

  async handleConnection(serverId: string): Promise<void> {
    const policy = await this.deps.policies.get(serverId)
    if (!policy || !policy.enabled) {
      return
    }
    policy.lastActivityAt = new Date()
    await this.deps.policies.set(policy)
    const server = await this.deps.servers.findOne(serverId)
    if (server.status !== 'stopped' && server.status !== 'error') {
      return
    }
    await this.deps.probe.close(serverId)
    try {
      await this.deps.servers.start(serverId)
    } catch {
      const after = await this.deps.servers.findOne(serverId)
      if (after.status === 'stopped' || after.status === 'error') {
        await this.listenProbe(serverId, after.port)
      }
    }
  }

  async runDue(now = new Date()): Promise<string[]> {
    const policies = await this.deps.policies.list()
    const stopped: string[] = []
    for (const policy of policies) {
      if (!policy.enabled) {
        continue
      }
      const server = await this.deps.servers.findOne(policy.serverId).catch(() => null)
      if (!server) {
        continue
      }
      if (server.status === 'running') {
        const lastActivity = policy.lastActivityAt ?? server.updatedAt
        if (now.getTime() - lastActivity.getTime() >= policy.inactiveMinutes * 60_000) {
          await this.deps.servers.stop(policy.serverId)
          stopped.push(policy.serverId)
          await this.listenProbe(policy.serverId, server.port)
        }
      } else if (server.status === 'stopped' || server.status === 'error') {
        await this.listenProbe(policy.serverId, server.port)
      }
    }
    return stopped
  }

  private async mustFindServer(serverId: string): Promise<void> {
    try {
      await this.deps.servers.findOne(serverId)
    } catch (err) {
      if (err instanceof ServersNotFoundError) {
        throw new AutoLifecycleNotFoundError(`server not found: ${serverId}`)
      }
      throw err
    }
  }

  private async listenProbe(serverId: string, port: number): Promise<void> {
    try {
      await this.deps.probe.listen(serverId, port, () => {
        void this.handleConnection(serverId)
      })
    } catch {
      // Port busy (e.g. server starting or external listener): retry on next tick.
    }
  }
}
