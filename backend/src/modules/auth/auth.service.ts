import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'node:crypto';
import { MEMBER_COLORS } from '@shared/domain';
import type { SessionDTO } from '@shared/contracts';
import { UsersRepository } from '../users/users.repository';
import { FamiliesService } from '../families/families.service';
import { RolesRepository } from '../roles/roles.repository';
import { PasswordResetTokensRepository } from './password-reset-tokens.repository';
import { MAIL_SENDER, type MailSender } from '../mail/mail-sender.interface';
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import type { JwtPayload } from './jwt.strategy';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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
    private readonly roles: RolesRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly resetTokens: PasswordResetTokensRepository,
    @Inject(MAIL_SENDER) private readonly mail: MailSender,
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
    await this.roles.assignDefault(user.id);

    // The family is joined after the user exists: both operations need the id.
    if (dto.inviteCode) {
      await this.families.joinByCode(user.id, dto.inviteCode);
    } else {
      await this.families.create(user.id, dto.familyName!);
    }

    // A fresh account stays logged in: the first thing after signing up is setup.
    return this.issueSession(user.id, true);
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
    await this.users.touchLogin(user.id);
    return this.issueSession(user.id, dto.rememberMe ?? false);
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
    // Carry the "remember me" choice forward so a refresh does not silently
    // turn a session-only login into a persistent one.
    return this.issueSession(payload.sub, payload.remember ?? false);
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
      roles: await this.roles.namesFor(user.id),
    };
  }

  /**
   * Always resolves the same way whether or not the e-mail has an account —
   * same anti-enumeration reasoning as login(). The token itself is random
   * (not derived from anything guessable); only its hash is stored, so a
   * database leak does not hand out working reset links.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.resetTokens.create(
        user.id,
        hashToken(token),
        new Date(Date.now() + RESET_TOKEN_TTL_MS),
      );
      const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
      const resetUrl = `${frontendUrl}/redefinir-senha?token=${token}`;
      await this.mail
        .sendPasswordReset({ to: user.email, name: user.name, resetUrl })
        .catch(() => undefined);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.resetTokens.findValid(hashToken(token));
    if (!record) {
      throw new UnauthorizedException('Link inválido ou expirado. Peça um novo.');
    }
    await this.users.updatePassword(record.userId, await argon2.hash(newPassword));
    await this.resetTokens.markUsed(record.id);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SessionDTO['user']> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new UnauthorizedException('Informe a senha atual pra trocar a senha.');
      }
      const matches = await argon2
        .verify(user.passwordHash, dto.currentPassword)
        .catch(() => false);
      if (!matches) throw new UnauthorizedException('Senha atual não confere.');
      await this.users.updatePassword(userId, await argon2.hash(dto.newPassword));
    }

    if (dto.name?.trim()) {
      await this.users.updateName(userId, dto.name.trim());
    }

    return this.me(userId);
  }

  private async issueSession(
    userId: string,
    remember: boolean,
  ): Promise<SessionDTO & { refreshToken: string; remember: boolean }> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    const roles = await this.roles.namesFor(user.id);

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const refreshPayload: JwtPayload = { ...payload, remember };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: duration(this.config.get<string>('JWT_ACCESS_TTL', '15m'), '15m'),
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: duration(this.config.get<string>('JWT_REFRESH_TTL', '30d'), '30d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      remember,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        color: user.color,
        familyId: user.familyId,
        roles,
      },
    };
  }
}
