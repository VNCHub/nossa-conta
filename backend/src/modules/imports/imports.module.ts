import { Module } from '@nestjs/common';
import { MonthLocksModule } from '../months/month-locks.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportsRepository } from './imports.repository';
import { ImportsStorage } from './imports.storage';

@Module({
  imports: [MonthLocksModule],
  controllers: [ImportsController],
  providers: [ImportsService, ImportsRepository, ImportsStorage],
})
export class ImportsModule {}
