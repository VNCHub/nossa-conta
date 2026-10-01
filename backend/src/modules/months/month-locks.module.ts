import { Module } from '@nestjs/common';
import { MonthLocksRepository } from './month-locks.repository';
import { MonthLocksService } from './month-locks.service';

@Module({
  providers: [MonthLocksRepository, MonthLocksService],
  exports: [MonthLocksRepository, MonthLocksService],
})
export class MonthLocksModule {}
