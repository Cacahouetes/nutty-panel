import { Inject, Controller, Get, Put, Param, Body, UseFilters } from '@nestjs/common'
import { AUTO_LIFECYCLE_SERVICE, type AutoLifecycleService } from './auto-lifecycle.service'
import type { SetAutoStartInput } from './auto-start-policy'
import { AutoLifecycleExceptionFilter } from './auto-lifecycle.exception-filter'

@Controller('api/servers/:serverId/auto-start')
@UseFilters(AutoLifecycleExceptionFilter)
export class AutoLifecycleController {
  constructor(
    @Inject(AUTO_LIFECYCLE_SERVICE)
    private readonly lifecycle: AutoLifecycleService,
  ) {}

  @Get()
  getPolicy(@Param('serverId') serverId: string) {
    return this.lifecycle.getPolicy(serverId)
  }

  @Put()
  setPolicy(@Param('serverId') serverId: string, @Body() body: SetAutoStartInput) {
    return this.lifecycle.setPolicy(serverId, body)
  }
}
