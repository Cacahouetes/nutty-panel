import { Controller, Get, Post, HttpCode, HttpStatus, Inject, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/auth.guard'
import { Roles, RolesGuard } from '../auth/roles.guard'
import { PROXY_SERVICE, type SmartProxyService } from './smart-proxy.service'

@ApiTags('proxy')
@ApiBearerAuth()
@Controller('api/proxy')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProxyController {
  constructor(@Inject(PROXY_SERVICE) private readonly service: SmartProxyService) {}

  @Get('status')
  @ApiOperation({ summary: 'Smart proxy status, routes and online state' })
  status() {
    return this.service.getStatus()
  }

  @Get('routes')
  @ApiOperation({ summary: 'List proxy routes with online status' })
  routes() {
    return this.service.getRoutes()
  }

  @Post('refresh')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rebuild routes from servers and restart the proxy' })
  async refresh(): Promise<void> {
    await this.service.refresh()
  }
}
