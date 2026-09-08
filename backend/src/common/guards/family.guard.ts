import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Blocks anyone who has not joined a family yet.
 *
 * Data isolation itself does not live here: it lives in the repository
 * signatures, which require familyId on every method and so do not let the
 * filter be forgotten. This guard only ensures there is a familyId to pass on.
 */
@Injectable()
export class FamilyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: AuthenticatedUser = context.switchToHttp().getRequest().user;
    if (!user?.familyId) {
      throw new ForbiddenException(
        'Você ainda não faz parte de uma família. Crie uma ou entre com um código de convite.',
      );
    }
    return true;
  }
}
