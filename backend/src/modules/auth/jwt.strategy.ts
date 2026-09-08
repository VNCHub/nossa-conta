import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersRepository } from '../users/users.repository';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

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
   * The family comes from the database on every request, not from the token: if
   * someone leaves the family, access drops immediately, without waiting for the
   * token to expire.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, familyId: user.familyId };
  }
}
