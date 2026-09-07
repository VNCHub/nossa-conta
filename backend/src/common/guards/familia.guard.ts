import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../decorators/usuario-atual.decorator';

/**
 * Barra quem ainda não entrou em nenhuma família.
 *
 * O isolamento de dados em si não mora aqui: mora na assinatura dos repositories,
 * que exigem familiaId em todo método e por isso não deixam o filtro ser esquecido.
 * Este guard só garante que existe um familiaId para passar adiante.
 */
@Injectable()
export class FamiliaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: UsuarioAutenticado = context.switchToHttp().getRequest().user;
    if (!user?.familiaId) {
      throw new ForbiddenException(
        'Você ainda não faz parte de uma família. Crie uma ou entre com um código de convite.',
      );
    }
    return true;
  }
}
