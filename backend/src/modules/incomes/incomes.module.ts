import { Module } from '@nestjs/common';
import { MonthLocksModule } from '../months/month-locks.module';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';
import { IncomesRepository } from './incomes.repository';

@Module({
  imports: [MonthLocksModule],
  controllers: [IncomesController],
  providers: [IncomesService, IncomesRepository],
  exports: [IncomesService],
})
export class IncomesModule {}
