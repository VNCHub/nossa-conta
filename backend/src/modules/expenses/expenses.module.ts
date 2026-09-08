import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from './expenses.repository';
import { UsersModule } from '../users/users.module';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [UsersModule, RulesModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesRepository],
  exports: [ExpensesService, ExpensesRepository],
})
export class ExpensesModule {}
