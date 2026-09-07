import { Module } from '@nestjs/common';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';
import { IncomesRepository } from './incomes.repository';

@Module({
  controllers: [IncomesController],
  providers: [IncomesService, IncomesRepository],
  exports: [IncomesService],
})
export class IncomesModule {}
