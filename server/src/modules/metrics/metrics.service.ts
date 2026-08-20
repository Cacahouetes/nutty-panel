import {
  ConflictError as DockerConflictError,
  NotFoundError as DockerNotFoundError,
  type DockerService,
} from '../docker/docker.service'
import { NotFoundError as ServersNotFoundError } from '../servers/servers.service'
import { MetricsNotFoundError, MetricsUnavailableError } from './metrics.errors'

export const METRICS_SERVICE = Symbol('MetricsService')

export interface MetricsSnapshot {
  serverId: string
  cpuPercent: number
  memoryUsageBytes: number
  memoryLimitBytes: number
  memoryPercent: number
  readAt: string
}

export interface MetricsService {
  getServerMetrics(serverId: string): Promise<MetricsSnapshot>
}

export interface MetricsServiceDeps {
  servers: { findOne(id: string): Promise<unknown> }
  docker: Pick<DockerService, 'getMetrics'>
}

export function createMetricsService(deps: MetricsServiceDeps): MetricsService {
  return {
    async getServerMetrics(serverId: string): Promise<MetricsSnapshot> {
      try {
        await deps.servers.findOne(serverId)
      } catch (err) {
        if (err instanceof ServersNotFoundError) {
          throw new MetricsNotFoundError(`server not found: ${serverId}`)
        }
        throw err
      }

      let metrics
      try {
        metrics = await deps.docker.getMetrics(serverId)
      } catch (err) {
        if (err instanceof DockerNotFoundError || err instanceof DockerConflictError) {
          throw new MetricsUnavailableError(`server not running: ${serverId}`)
        }
        throw err
      }

      return {
        serverId,
        cpuPercent: metrics.cpuPercent,
        memoryUsageBytes: metrics.memoryUsageBytes,
        memoryLimitBytes: metrics.memoryLimitBytes,
        memoryPercent: metrics.memoryPercent,
        readAt: metrics.readAt.toISOString(),
      }
    },
  }
}
