import { Module } from '@nestjs/common';
import { GastosController } from './gastos.controller';
import { GastosService } from './gastos.service';
import { GastosRepository } from './gastos.repository';
import { UsersModule } from '../users/users.module';
import { RegrasModule } from '../regras/regras.module';

@Module({
  imports: [UsersModule, RegrasModule],
  controllers: [GastosController],
  providers: [GastosService, GastosRepository],
  exports: [GastosService, GastosRepository],
})
export class GastosModule {}
