import { Module } from '@nestjs/common';
import { MonthsController } from './months.controller';
import { MonthsService } from './months.service';
import { MonthLocksModule } from './month-locks.module';
import { MonthClosingsRepository } from './month-closings.repository';
import { UsersModule } from '../users/users.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [MonthLocksModule, UsersModule, ReportsModule],
  controllers: [MonthsController],
  providers: [MonthsService, MonthClosingsRepository],
})
export class MonthsModule {}
