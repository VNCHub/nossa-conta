import { Module } from '@nestjs/common';
import { MonthsController } from './months.controller';
import { MonthsService } from './months.service';
import { MonthLocksModule } from './month-locks.module';

@Module({
  imports: [MonthLocksModule],
  controllers: [MonthsController],
  providers: [MonthsService],
})
export class MonthsModule {}
