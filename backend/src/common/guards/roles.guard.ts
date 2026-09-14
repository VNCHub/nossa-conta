import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppRole } from '@shared/domain';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Independent of FamilyGuard on purpose: roles are a platform-wide concern
 * (e.g. the admin panel), not tied to family membership.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user: AuthenticatedUser = context.switchToHttp().getRequest().user;
    if (!required.some((role) => user?.roles?.includes(role))) {
      throw new ForbiddenException('Você não tem permissão para acessar isso.');
    }
    return true;
  }
}
