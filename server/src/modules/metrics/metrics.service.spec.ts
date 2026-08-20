import { describe, it, expect } from '@jest/globals'
import { createMetricsService } from './metrics.service'
import { MetricsNotFoundError, MetricsUnavailableError } from './metrics.errors'
import { NotFoundError as ServersNotFoundError } from '../servers/servers.service'
import { ConflictError, NotFoundError as DockerNotFoundError } from '../docker/docker.service'
import type { DockerService } from '../docker/docker.service'

class FakeServersService {
  readonly known = new Set(['server-1'])

  async findOne(id: string): Promise<unknown> {
    if (!this.known.has(id)) throw new ServersNotFoundError(`server not found: ${id}`)
    return { id }
  }
}

class FakeDockerService implements Pick<DockerService, 'getMetrics'> {
  readonly metrics = new Map<string, Awaited<ReturnType<DockerService['getMetrics']>>>()
  readonly errors = new Map<string, Error>()

  async getMetrics(id: string) {
    const error = this.errors.get(id)
    if (error) throw error
    const value = this.metrics.get(id)
    if (!value) throw new DockerNotFoundError(`server not deployed: ${id}`)
    return value
  }
}

function buildService() {
  const servers = new FakeServersService()
  const docker = new FakeDockerService()
  const service = createMetricsService({ servers, docker })
  return { servers, docker, service }
}

describe('MetricsService', () => {
  it('maps docker metrics into a snapshot', async () => {
    const { docker, service } = buildService()
    docker.metrics.set('server-1', {
      cpuPercent: 40,
      memoryUsageBytes: 512 * 1024 * 1024,
      memoryLimitBytes: 2048 * 1024 * 1024,
      memoryPercent: 25,
      readAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    await expect(service.getServerMetrics('server-1')).resolves.toEqual({
      serverId: 'server-1',
      cpuPercent: 40,
      memoryUsageBytes: 512 * 1024 * 1024,
      memoryLimitBytes: 2048 * 1024 * 1024,
      memoryPercent: 25,
      readAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('throws MetricsNotFoundError for an unknown server', async () => {
    const { service } = buildService()

    await expect(service.getServerMetrics('missing')).rejects.toThrow(MetricsNotFoundError)
  })

  it('throws MetricsUnavailableError when the container is not running', async () => {
    const { docker, service } = buildService()
    docker.errors.set('server-1', new ConflictError('server not running: server-1'))

    await expect(service.getServerMetrics('server-1')).rejects.toThrow(MetricsUnavailableError)
  })

  it('throws MetricsUnavailableError when the server is not deployed', async () => {
    const { service } = buildService()

    await expect(service.getServerMetrics('server-1')).rejects.toThrow(MetricsUnavailableError)
  })

  it('rethrows unexpected docker errors', async () => {
    const { docker, service } = buildService()
    const unexpected = new Error('boom')
    docker.errors.set('server-1', unexpected)

    await expect(service.getServerMetrics('server-1')).rejects.toThrow('boom')
  })
})
