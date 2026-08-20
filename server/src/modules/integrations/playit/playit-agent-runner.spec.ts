import { describe, it, expect } from '@jest/globals'
import {
  ChildProcessPlayitAgentRunner,
  PlayitAgentUnavailableError,
  type PlayitAgentRunner,
  type SpawnedChild,
} from './playit-agent-runner'

function fakeChild(): {
  child: SpawnedChild & { exit: (code: number) => void }
  kill: jest.Mock
} {
  let exitHandler: ((code: number | null) => void) | undefined
  const kill = jest.fn(() => {
    child.exitCode = 0
    exitHandler?.(0)
    return true
  })
  const child: SpawnedChild & { exit: (code: number) => void } = {
    exitCode: null,
    on: (_event: 'exit', handler: (code: number | null) => void) => {
      exitHandler = handler
    },
    kill,
    exit(code: number) {
      child.exitCode = code
      exitHandler?.(code)
    },
  }
  return { child, kill }
}

function build(overrides: Partial<Parameters<typeof createRunner>[0]> = {}) {
  const { child, kill } = fakeChild()
  const spawned: SpawnedChild[] = []
  const spawn = jest.fn(() => {
    spawned.push(child)
    return child
  })
  const runner = createRunner({
    bin: '/usr/bin/playit',
    secret: 'agent-secret',
    spawn,
    ...overrides,
  })
  return { runner, child, kill, spawn, spawned }
}

function createRunner(deps: {
  bin?: string
  secret?: string
  spawn: (bin: string, args: string[], options: Record<string, unknown>) => SpawnedChild
}): PlayitAgentRunner {
  return new ChildProcessPlayitAgentRunner(deps)
}

describe('ChildProcessPlayitAgentRunner', () => {
  it('reports disabled when no binary is configured', () => {
    const { runner } = build({ bin: undefined })
    expect(runner.status()).toBe('disabled')
  })

  it('reports disabled when no secret is configured', () => {
    const { runner } = build({ secret: undefined })
    expect(runner.status()).toBe('disabled')
  })

  it('starts the agent binary with the secret', async () => {
    const { runner, spawn } = build()

    await runner.start()

    expect((spawn as jest.Mock).mock.calls[0]).toEqual([
      '/usr/bin/playit',
      ['--secret', 'agent-secret'],
      { stdio: 'ignore' },
    ])
    expect(runner.status()).toBe('running')
  })

  it('throws when starting a disabled runner', async () => {
    const { runner } = build({ bin: undefined })
    await expect(runner.start()).rejects.toBeInstanceOf(PlayitAgentUnavailableError)
  })

  it('stops a running agent', async () => {
    const { runner, kill } = build()
    await runner.start()

    await runner.stop()

    expect(kill).toHaveBeenCalled()
    expect(runner.status()).toBe('stopped')
  })

  it('reports error when the agent exits with a non-zero code', async () => {
    const { runner, child } = build()
    await runner.start()

    child.exit(1)

    expect(runner.status()).toBe('error')
  })

  it('reports stopped when the agent exits cleanly', async () => {
    const { runner, child } = build()
    await runner.start()

    child.exit(0)

    expect(runner.status()).toBe('stopped')
  })
})
