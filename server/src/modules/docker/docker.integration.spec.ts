import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { existsSync } from 'node:fs'
import Docker from 'dockerode'
import { DockerContainerManager } from './docker.container.manager'

const DOCKER_AVAILABLE =
  process.env.DOCKER_INTEGRATION === '1' ||
  existsSync('/var/run/docker.sock') ||
  existsSync('\\\\.\\pipe\\docker_engine')

const IMAGE = 'alpine:3.20'
const NAME = 'nutty-integration-test'

const maybeDescribe = DOCKER_AVAILABLE ? describe : describe.skip

maybeDescribe('DockerContainerManager (integration)', () => {
  const docker = new Docker()
  const manager = new DockerContainerManager(docker)

  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      docker.pull(IMAGE, (err: Error | null, stream?: NodeJS.ReadableStream) => {
        if (err || !stream) {
          reject(err ?? new Error('pull returned no stream'))
          return
        }
        void docker.modem.followProgress(
          stream,
          (pullErr: Error | null) => (pullErr ? reject(pullErr) : resolve()),
          () => {},
        )
      })
    })
  }, 120_000)

  afterAll(async () => {
    try {
      await docker.getContainer(NAME).remove({ force: true, v: true })
    } catch {
      // container already gone
    }
  })

  it('creates, starts, inspects, logs and removes a container', async () => {
    const id = await manager.create({
      name: NAME,
      image: IMAGE,
      env: { FOO: 'bar' },
      ports: [],
      resources: { cpuPercent: 10, memoryMb: 128 },
      volumeName: 'nutty-integration-test-data',
      mountPath: '/data',
      cmd: ['tail', '-f', '/dev/null'],
    })
    await manager.start(id)

    try {
      expect(await manager.inspect(id)).toBe('running')

      const logs = await manager.logs(id, 10)
      expect(Array.isArray(logs)).toBe(true)

      await manager.stop(id)
      expect(await manager.inspect(id)).toBe('stopped')

      await manager.restart(id)
      expect(await manager.inspect(id)).toBe('running')
    } finally {
      await manager.remove(id)
    }
  }, 60_000)
})
