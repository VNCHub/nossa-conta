import { Module } from '@nestjs/common';
import { EntradasController } from './entradas.controller';
import { EntradasService } from './entradas.service';
import { EntradasRepository } from './entradas.repository';

@Module({
  controllers: [EntradasController],
  providers: [EntradasService, EntradasRepository],
  exports: [EntradasService],
})
export class EntradasModule {}
