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
import { CurrentUser, JwtAuthGuard } from './auth.guard'
import { AUTH_SERVICE, type AuthService } from './auth.service'
import { AuthExceptionFilter } from './auth.exception-filter'
import { Roles, RolesGuard } from './roles.guard'
import type { AuthenticatedUser } from './user'

export interface LoginBody {
  email: string
  password: string
  totpCode?: string
}

@Controller('api/auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(@Inject(AUTH_SERVICE) private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginBody) {
    return this.auth.login(body)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.auth.refresh(refreshToken)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body('refreshToken') refreshToken: string): Promise<void> {
    await this.auth.logout(refreshToken)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getCurrentUser(user.id)
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adminOnly() {
    return { ok: true }
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  setupTotp(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.setupTotp(user.id)
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  enableTotp(@CurrentUser() user: AuthenticatedUser, @Body('code') code: string) {
    return this.auth.enableTotp(user.id, code)
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  disableTotp(@CurrentUser() user: AuthenticatedUser, @Body('code') code: string) {
    return this.auth.disableTotp(user.id, code)
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  createApiKey(@CurrentUser() user: AuthenticatedUser, @Body('name') name: string) {
    return this.auth.createApiKey(user.id, name)
  }

  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  listApiKeys(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.listApiKeys(user.id)
  }

  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.auth.revokeApiKey(user.id, id)
  }
}
