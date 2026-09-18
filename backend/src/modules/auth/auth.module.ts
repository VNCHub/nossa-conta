import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PasswordResetTokensRepository } from './password-reset-tokens.repository';
import { UsersModule } from '../users/users.module';
import { FamiliesModule } from '../families/families.module';
import { RolesModule } from '../roles/roles.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
    FamiliesModule,
    RolesModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PasswordResetTokensRepository],
})
export class AuthModule {}
