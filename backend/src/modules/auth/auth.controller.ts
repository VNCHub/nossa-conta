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
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

const COOKIE_REFRESH = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, remember, ...session } = await this.auth.register(dto);
    this.writeCookie(res, refreshToken, remember);
    return session;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, remember, ...session } = await this.auth.login(dto);
    this.writeCookie(res, refreshToken, remember);
    return session;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, remember, ...session } = await this.auth.refresh(
      req.cookies?.[COOKIE_REFRESH],
    );
    this.writeCookie(res, refreshToken, remember);
    return session;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_REFRESH, { path: '/auth' });
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }

  /**
   * The refresh token lives in an httpOnly cookie: page JavaScript cannot reach
   * it, so an XSS does not carry off the long session. The short access token
   * stays in memory.
   *
   * Without "remember me" the cookie has no maxAge — the browser drops it when
   * the session ends, so the login does not survive a restart.
   */
  private writeCookie(res: Response, refreshToken: string, remember: boolean) {
    const production = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_REFRESH, refreshToken, {
      httpOnly: true,
      secure: production,
      sameSite: production ? 'none' : 'lax',
      path: '/auth',
      ...(remember ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
    });
  }
}
