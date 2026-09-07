import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamiliasModule } from './modules/familias/familias.module';
import { EntradasModule } from './modules/entradas/entradas.module';
import { GastosModule } from './modules/gastos/gastos.module';
import { RegrasModule } from './modules/regras/regras.module';
import { RelatoriosModule } from './modules/relatorios/relatorios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FamiliasModule,
    EntradasModule,
    GastosModule,
    RegrasModule,
    RelatoriosModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
