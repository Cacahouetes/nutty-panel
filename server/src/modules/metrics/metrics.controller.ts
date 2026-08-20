import { Inject, Controller, Get, Param, UseFilters } from '@nestjs/common'
import { METRICS_SERVICE, type MetricsService } from './metrics.service'
import { MetricsExceptionFilter } from './metrics.exception-filter'

@Controller('api')
@UseFilters(MetricsExceptionFilter)
export class MetricsController {
  constructor(
    @Inject(METRICS_SERVICE)
    private readonly metrics: MetricsService,
  ) {}

  @Get('servers/:serverId/metrics')
  getMetrics(@Param('serverId') serverId: string) {
    return this.metrics.getServerMetrics(serverId)
  }
}
