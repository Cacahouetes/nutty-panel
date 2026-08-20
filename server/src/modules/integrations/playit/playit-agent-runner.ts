import { spawn as nodeSpawn } from 'node:child_process'

export class PlayitAgentUnavailableError extends Error {
  constructor(message = 'playit agent is not configured') {
    super(message)
    this.name = 'PlayitAgentUnavailableError'
  }
}

export type PlayitAgentStatus = 'running' | 'stopped' | 'error' | 'disabled'

export interface SpawnedChild {
  on(event: 'exit', handler: (code: number | null) => void): unknown
  kill(signal?: NodeJS.Signals): boolean
  exitCode: number | null
}

export interface SpawnFn {
  (bin: string, args: string[], options: Record<string, unknown>): SpawnedChild
}

export interface PlayitAgentRunner {
  start(): Promise<void>
  stop(): Promise<void>
  status(): PlayitAgentStatus
}

export const PLAYIT_AGENT_RUNNER = Symbol('PlayitAgentRunner')

export interface ChildProcessPlayitAgentRunnerDeps {
  bin?: string
  secret?: string
  spawn?: SpawnFn
}

export class ChildProcessPlayitAgentRunner implements PlayitAgentRunner {
  private readonly bin?: string
  private readonly secret?: string
  private readonly spawnFn: SpawnFn
  private child?: SpawnedChild

  constructor(deps: ChildProcessPlayitAgentRunnerDeps) {
    this.bin = deps.bin
    this.secret = deps.secret
    this.spawnFn = deps.spawn ?? ((bin, args, options) => nodeSpawn(bin, args, options))
  }

  async start(): Promise<void> {
    if (!this.bin || !this.secret) {
      throw new PlayitAgentUnavailableError()
    }
    const child = this.spawnFn(this.bin, ['--secret', this.secret], { stdio: 'ignore' })
    this.child = child
  }

  async stop(): Promise<void> {
    this.child?.kill()
  }

  status(): PlayitAgentStatus {
    if (!this.bin || !this.secret) {
      return 'disabled'
    }
    if (!this.child) {
      return 'stopped'
    }
    if (this.child.exitCode !== null) {
      return this.child.exitCode === 0 ? 'stopped' : 'error'
    }
    return 'running'
  }
}
