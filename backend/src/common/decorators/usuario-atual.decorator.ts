import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioAutenticado {
  id: string;
  email: string;
  familiaId: string | null;
}

/**
 * Usuário resolvido pelo JwtStrategy. É a ÚNICA origem aceita de familiaId:
 * nenhum service pode confiar em familiaId vindo do corpo da requisição.
 */
export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest().user,
);
