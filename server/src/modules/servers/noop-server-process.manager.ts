import type { ServerProcessManager } from './server-process.manager'

export class NoopServerProcessManager implements ServerProcessManager {
  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  async kill(): Promise<void> {}
}
