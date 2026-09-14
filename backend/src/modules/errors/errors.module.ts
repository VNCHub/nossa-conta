import { Module } from '@nestjs/common';
import { ErrorsController } from './errors.controller';
import { ErrorsService } from './errors.service';
import { ErrorsRepository } from './errors.repository';

@Module({
  controllers: [ErrorsController],
  providers: [ErrorsService, ErrorsRepository],
  exports: [ErrorsService],
})
export class ErrorsModule {}
