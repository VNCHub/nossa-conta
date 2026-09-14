import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { FamiliesModule } from '../families/families.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule, FamiliesModule, RolesModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
