import { Module } from '@nestjs/common';
import { RegrasController } from './regras.controller';
import { RegrasService } from './regras.service';
import { RegrasRepository } from './regras.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [RegrasController],
  providers: [RegrasService, RegrasRepository],
  exports: [RegrasService, RegrasRepository],
})
export class RegrasModule {}
