import type { AutoStartPolicy } from './auto-start-policy'
import type { AutoStartPolicyStore } from './auto-start-policy.store'

export class InMemoryAutoStartPolicyStore implements AutoStartPolicyStore {
  private readonly policies = new Map<string, AutoStartPolicy>()

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
