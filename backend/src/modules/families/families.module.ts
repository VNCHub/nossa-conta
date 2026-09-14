import { Module } from '@nestjs/common';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';
import { FamiliesRepository } from './families.repository';
import { UsersModule } from '../users/users.module';
import { IncomesModule } from '../incomes/incomes.module';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [UsersModule, IncomesModule, ExpensesModule],
  controllers: [FamiliesController],
  providers: [FamiliesService, FamiliesRepository],
  exports: [FamiliesService, FamiliesRepository],
})
export class FamiliesModule {}
