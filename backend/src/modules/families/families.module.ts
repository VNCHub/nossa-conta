import { Module } from '@nestjs/common';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';
import { FamiliesRepository } from './families.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [FamiliesController],
  providers: [FamiliesService, FamiliesRepository],
  exports: [FamiliesService, FamiliesRepository],
})
export class FamiliesModule {}
