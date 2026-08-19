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
  Query,
  UseFilters,
} from '@nestjs/common'
import { MOD_INSTALLER_SERVICE, type ModInstallerService } from './mod-installer.service'
import { IntegrationsExceptionFilter } from './integrations.exception-filter'
import type { ModProviderName, ModSearchOptions, ModType } from './mod-provider'

export interface InstallModBody extends ModSearchOptions {
  provider: ModProviderName
  projectId: string
}

@Controller('api')
@UseFilters(IntegrationsExceptionFilter)
export class IntegrationsController {
  constructor(
    @Inject(MOD_INSTALLER_SERVICE)
    private readonly installer: ModInstallerService,
  ) {}

  @Get('integrations/:provider/search')
  search(
    @Param('provider') provider: ModProviderName,
    @Query('query') query: string,
    @Query('type') type?: ModType,
    @Query('gameVersion') gameVersion?: string,
    @Query('loader') loader?: string,
  ) {
    return this.installer.search(provider, query, { type, gameVersion, loader })
  }

  @Post('servers/:serverId/integrations/install')
  install(@Param('serverId') serverId: string, @Body() body: InstallModBody) {
    return this.installer.install(serverId, body.provider, body.projectId, {
      type: body.type,
      gameVersion: body.gameVersion,
      loader: body.loader,
    })
  }

  @Get('servers/:serverId/integrations/installed')
  listInstalled(@Param('serverId') serverId: string) {
    return this.installer.listInstalled(serverId)
  }

  @Delete('integrations/installed/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async uninstall(@Param('id') id: string) {
    await this.installer.uninstall(id)
  }
}
