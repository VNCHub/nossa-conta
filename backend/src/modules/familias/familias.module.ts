import { Module } from '@nestjs/common';
import { FamiliasController } from './familias.controller';
import { FamiliasService } from './familias.service';
import { FamiliasRepository } from './familias.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [FamiliasController],
  providers: [FamiliasService, FamiliasRepository],
  exports: [FamiliasService, FamiliasRepository],
})
export class FamiliasModule {}
