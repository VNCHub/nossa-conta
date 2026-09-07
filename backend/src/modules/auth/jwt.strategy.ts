import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersRepository } from '../users/users.repository';
import type { UsuarioAutenticado } from '../../common/decorators/usuario-atual.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * A família vem do banco a cada requisição, não do token: se alguém sai da
   * família, o acesso cai na hora, sem esperar o token expirar.
   */
  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const user = await this.users.buscarPorId(payload.sub);
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, familiaId: user.familiaId };
  }
}
