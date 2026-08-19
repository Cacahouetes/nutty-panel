import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common'
import type { Request } from 'express'
import { AUTH_SERVICE, type AuthService } from './auth.service'
import { TOKEN_SERVICE, type TokenService } from './token.service'
import type { AuthenticatedUser } from './user'

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user,
)

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(AUTH_SERVICE) private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>()
    const authorization = request.headers.authorization
    if (authorization?.startsWith('Bearer ')) {
      try {
        const payload = this.tokens.verifyAccess(authorization.slice(7))
        request.user = {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
        }
        return true
      } catch {
        throw new UnauthorizedException()
      }
    }
    const apiKey = request.headers['x-api-key']
    if (apiKey) {
      const user = await this.auth.resolveApiKey(String(apiKey))
      if (user) {
        request.user = { id: user.id, email: user.email, role: user.role }
        return true
      }
    }
    throw new UnauthorizedException()
  }
}
