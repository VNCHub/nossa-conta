import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { MEMBER_COLORS } from '@shared/domain';
import type { SessionDTO } from '@shared/contracts';
import { UsersRepository } from '../users/users.repository';
import { FamiliesService } from '../families/families.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import type { JwtPayload } from './jwt.strategy';

/**
 * The TTL comes from the environment as a string ("15m", "30d"). The type the
 * lib expects is a template literal that a plain string does not satisfy — the
 * assertion trades the static check for a format validation done here.
 */
type Duration = Parameters<JwtService['signAsync']>[1] extends infer O
  ? O extends { expiresIn?: infer E }
    ? E
    : never
  : never;

const TTL_FORMAT = /^\d+(ms|s|m|h|d|w|y)?$/;

function duration(value: string, fallback: string): Duration {
  const chosen = TTL_FORMAT.test(value) ? value : fallback;
  return chosen as Duration;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly families: FamiliesService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('Esse e-mail já tem conta. Use a opção de entrar.');
    }
    if (!dto.inviteCode && !dto.familyName) {
      throw new ConflictException(
        'Crie uma família ou entre com um código de convite.',
      );
    }

    const user = await this.users.create({
      name: dto.name.trim(),
      email: dto.email,
      passwordHash: await argon2.hash(dto.password),
      color: MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)],
    });

    // The family is joined after the user exists: both operations need the id.
    if (dto.inviteCode) {
      await this.families.joinByCode(user.id, dto.inviteCode);
    } else {
      await this.families.create(user.id, dto.familyName!);
    }

    return this.issueSession(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    // Verify the hash even with no user so the response time does not reveal
    // which e-mails have an account.
    const matches = user
      ? await argon2.verify(user.passwordHash, dto.password).catch(() => false)
      : await argon2
          .hash(dto.password)
          .then(() => false)
          .catch(() => false);

    if (!user || !matches) {
      throw new UnauthorizedException('E-mail ou senha não conferem.');
    }
    return this.issueSession(user.id);
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Sessão expirada.');
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sessão expirada.');
    }
    return this.issueSession(payload.sub);
  }

  async me(userId: string): Promise<SessionDTO['user']> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      color: user.color,
      familyId: user.familyId,
    };
  }

  private async issueSession(
    userId: string,
  ): Promise<SessionDTO & { refreshToken: string }> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: duration(this.config.get<string>('JWT_ACCESS_TTL', '15m'), '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: duration(this.config.get<string>('JWT_REFRESH_TTL', '30d'), '30d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        color: user.color,
        familyId: user.familyId,
      },
    };
  }
}
