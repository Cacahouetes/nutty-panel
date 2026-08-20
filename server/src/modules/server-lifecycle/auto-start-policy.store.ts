import type { AutoStartPolicy } from './auto-start-policy'

export interface AutoStartPolicyStore {
  get(serverId: string): Promise<AutoStartPolicy | undefined>
  list(): Promise<AutoStartPolicy[]>
  set(policy: AutoStartPolicy): Promise<AutoStartPolicy>
}

export const AUTO_START_POLICY_STORE = Symbol('AutoStartPolicyStore')
