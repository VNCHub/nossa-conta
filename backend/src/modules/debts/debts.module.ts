import { Module } from '@nestjs/common';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';
import { DebtsRepository } from './debts.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [DebtsController],
  providers: [DebtsService, DebtsRepository],
  exports: [DebtsRepository],
})
export class DebtsModule {}
