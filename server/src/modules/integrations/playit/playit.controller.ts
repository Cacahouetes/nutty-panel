import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Inject,
  HttpCode,
  HttpStatus,
  UseFilters,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../auth/auth.guard'
import { Roles, RolesGuard } from '../../auth/roles.guard'
import { PLAYIT_SERVICE, type PlayitService } from './playit.service'
import { PlayitExceptionFilter } from './playit.exception-filter'

@ApiTags('playit')
@ApiBearerAuth()
@Controller('api/playit')
@UseFilters(PlayitExceptionFilter)
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlayitController {
  constructor(@Inject(PLAYIT_SERVICE) private readonly playit: PlayitService) {}

  @Get('status')
  @ApiOperation({ summary: 'Playit agent status and tunnel count' })
  status() {
    return this.playit.getStatus()
  }

  @Get('tunnels')
  @ApiOperation({ summary: 'List configured tunnels' })
  tunnels() {
    return this.playit.listTunnels()
  }

  @Get('servers/:serverId/tunnels')
  @ApiOperation({ summary: 'Get the tunnel of a server' })
  @ApiParam({ name: 'serverId', type: String })
  get(@Param('serverId') serverId: string) {
    return this.playit.getTunnel(serverId)
  }

  @Post('servers/:serverId/tunnels')
  @Roles('admin')
  @ApiOperation({ summary: 'Ensure a tunnel exists for a server' })
  @ApiParam({ name: 'serverId', type: String })
  create(@Param('serverId') serverId: string) {
    return this.playit.ensureTunnel(serverId)
  }

  @Delete('servers/:serverId/tunnels')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove the tunnel of a server' })
  @ApiParam({ name: 'serverId', type: String })
  async remove(@Param('serverId') serverId: string): Promise<void> {
    await this.playit.removeTunnel(serverId)
  }
}
