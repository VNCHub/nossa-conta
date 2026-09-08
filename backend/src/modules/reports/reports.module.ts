import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { UsersModule } from '../users/users.module';
import { IncomesModule } from '../incomes/incomes.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [UsersModule, IncomesModule, ExpensesModule, RulesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
