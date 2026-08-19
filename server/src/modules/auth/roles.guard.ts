import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { roleAtLeast, type AuthenticatedUser, type UserRole } from './user'

export const ROLES_KEY = 'roles'

export function Roles(...roles: UserRole[]): MethodDecorator & ClassDecorator {
  return SetMetadata(ROLES_KEY, roles)
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true
    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user
    if (!user || !required.some((role) => roleAtLeast(user.role, role))) {
      throw new ForbiddenException()
    }
    return true
  }
}
