import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { CORES_MEMBRO } from '@shared/dominio';
import type { SessaoDTO } from '@shared/contratos';
import { UsersRepository } from '../users/users.repository';
import { FamiliasService } from '../familias/familias.service';
import { LoginDto, RegistrarDto } from './dto/auth.dto';
import type { JwtPayload } from './jwt.strategy';

/**
 * O TTL vem do ambiente como string ("15m", "30d"). O tipo que a lib espera é
 * um literal template que uma string comum não satisfaz — a asserção troca a
 * checagem estática por uma validação de formato feita aqui.
 */
type Duracao = Parameters<JwtService['signAsync']>[1] extends infer O
  ? O extends { expiresIn?: infer E }
    ? E
    : never
  : never;

const FORMATO_TTL = /^\d+(ms|s|m|h|d|w|y)?$/;

function duracao(valor: string, padrao: string): Duracao {
  const escolhido = FORMATO_TTL.test(valor) ? valor : padrao;
  return escolhido as Duracao;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly familias: FamiliasService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registrar(dto: RegistrarDto) {
    if (await this.users.buscarPorEmail(dto.email)) {
      throw new ConflictException('Esse e-mail já tem conta. Use a opção de entrar.');
    }
    if (!dto.codigoConvite && !dto.nomeFamilia) {
      throw new ConflictException(
        'Crie uma família ou entre com um código de convite.',
      );
    }

    const user = await this.users.criar({
      nome: dto.nome.trim(),
      email: dto.email,
      senhaHash: await argon2.hash(dto.senha),
      cor: CORES_MEMBRO[Math.floor(Math.random() * CORES_MEMBRO.length)],
    });

    // A família entra depois do usuário existir: as duas operações precisam do id.
    if (dto.codigoConvite) {
      await this.familias.entrarPorCodigo(user.id, dto.codigoConvite);
    } else {
      await this.familias.criar(user.id, dto.nomeFamilia!);
    }

    return this.emitirSessao(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.users.buscarPorEmail(dto.email);
    // Verifica o hash mesmo sem usuário para não revelar, pelo tempo de resposta,
    // quais e-mails têm conta.
    const confere = user
      ? await argon2.verify(user.senhaHash, dto.senha).catch(() => false)
      : await argon2
          .hash(dto.senha)
          .then(() => false)
          .catch(() => false);

    if (!user || !confere) {
      throw new UnauthorizedException('E-mail ou senha não conferem.');
    }
    return this.emitirSessao(user.id);
  }

  async renovar(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Sessão expirada.');
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sessão expirada.');
    }
    return this.emitirSessao(payload.sub);
  }

  async eu(userId: string): Promise<SessaoDTO['user']> {
    const user = await this.users.buscarPorId(userId);
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      cor: user.cor,
      familiaId: user.familiaId,
    };
  }

  private async emitirSessao(
    userId: string,
  ): Promise<SessaoDTO & { refreshToken: string }> {
    const user = await this.users.buscarPorId(userId);
    if (!user) throw new UnauthorizedException();

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: duracao(this.config.get<string>('JWT_ACCESS_TTL', '15m'), '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: duracao(this.config.get<string>('JWT_REFRESH_TTL', '30d'), '30d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cor: user.cor,
        familiaId: user.familiaId,
      },
    };
  }
}
