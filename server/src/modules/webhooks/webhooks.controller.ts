import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/auth.guard'
import { Roles, RolesGuard } from '../auth/roles.guard'
import { ApiRateLimitGuard } from './api-rate-limiter'
import type { CreateWebhookInput } from './webhook'
import { WEBHOOKS_SERVICE, type WebhooksService } from './webhooks.service'
import { WebhooksExceptionFilter } from './webhooks.exception-filter'

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('api/webhooks')
@UseFilters(WebhooksExceptionFilter)
@UseGuards(JwtAuthGuard, ApiRateLimitGuard, RolesGuard)
export class WebhooksController {
  constructor(@Inject(WEBHOOKS_SERVICE) private readonly webhooks: WebhooksService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a webhook' })
  create(@Body() body: CreateWebhookInput) {
    return this.webhooks.createWebhook(body)
  }

  @Get()
  @ApiOperation({ summary: 'List webhooks' })
  list() {
    return this.webhooks.listWebhooks()
  }

  @Get('events')
  @ApiOperation({ summary: 'List the events a webhook can subscribe to' })
  events() {
    return { events: this.webhooks.listEventNames() }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook by id' })
  @ApiParam({ name: 'id', type: String })
  get(@Param('id') id: string) {
    return this.webhooks.getWebhook(id)
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id') id: string): Promise<void> {
    await this.webhooks.deleteWebhook(id)
  }
}
