import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegistrarDto } from './dto/auth.dto';
import { Publico } from '../../common/decorators/publico.decorator';
import {
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../common/decorators/usuario-atual.decorator';

const COOKIE_REFRESH = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Post('register')
  async registrar(@Body() dto: RegistrarDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...sessao } = await this.auth.registrar(dto);
    this.gravarCookie(res, refreshToken);
    return sessao;
  }

  @Publico()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...sessao } = await this.auth.login(dto);
    this.gravarCookie(res, refreshToken);
    return sessao;
  }

  @Publico()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async renovar(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...sessao } = await this.auth.renovar(
      req.cookies?.[COOKIE_REFRESH],
    );
    this.gravarCookie(res, refreshToken);
    return sessao;
  }

  @Publico()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  sair(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_REFRESH, { path: '/auth' });
  }

  @Get('me')
  eu(@UsuarioAtual() user: UsuarioAutenticado) {
    return this.auth.eu(user.id);
  }

  /**
   * O refresh vive em cookie httpOnly: JavaScript da página não o alcança, então
   * um XSS não leva embora a sessão longa. O access token, curto, fica em memória.
   */
  private gravarCookie(res: Response, refreshToken: string) {
    const producao = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_REFRESH, refreshToken, {
      httpOnly: true,
      secure: producao,
      sameSite: producao ? 'none' : 'lax',
      path: '/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}
