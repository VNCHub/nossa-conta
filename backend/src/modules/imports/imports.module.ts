import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportsRepository } from './imports.repository';
import { ImportsStorage } from './imports.storage';

@Module({
  controllers: [ImportsController],
  providers: [ImportsService, ImportsRepository, ImportsStorage],
})
export class ImportsModule {}
