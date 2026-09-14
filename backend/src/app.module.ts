import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamiliesModule } from './modules/families/families.module';
import { IncomesModule } from './modules/incomes/incomes.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { RulesModule } from './modules/rules/rules.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ImportsModule } from './modules/imports/imports.module';
import { RolesModule } from './modules/roles/roles.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FamiliesModule,
    IncomesModule,
    ExpensesModule,
    RulesModule,
    ReportsModule,
    ImportsModule,
    RolesModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
