import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseFilters,
} from '@nestjs/common'
import {
  SERVERS_SERVICE,
  type CreateServerInput,
  type ServersService,
  type UpdateServerInput,
} from './servers.service'
import { ServersExceptionFilter } from './servers.exception-filter'

@Controller('api/servers')
@UseFilters(ServersExceptionFilter)
export class ServersController {
  constructor(@Inject(SERVERS_SERVICE) private readonly servers: ServersService) {}

  @Post()
  create(@Body() input: CreateServerInput) {
    return this.servers.create(input)
  }

  @Get()
  findAll() {
    return this.servers.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servers.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateServerInput) {
    return this.servers.update(id, input)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.servers.remove(id)
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.servers.start(id)
  }

  @Post(':id/stop')
  stop(@Param('id') id: string) {
    return this.servers.stop(id)
  }

  @Post(':id/restart')
  restart(@Param('id') id: string) {
    return this.servers.restart(id)
  }

  @Post(':id/kill')
  kill(@Param('id') id: string) {
    return this.servers.kill(id)
  }
}
