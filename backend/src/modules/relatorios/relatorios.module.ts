import { Module } from '@nestjs/common';
import { RelatoriosController } from './relatorios.controller';
import { RelatoriosService } from './relatorios.service';
import { UsersModule } from '../users/users.module';
import { EntradasModule } from '../entradas/entradas.module';
import { GastosModule } from '../gastos/gastos.module';
import { RegrasModule } from '../regras/regras.module';

@Module({
  imports: [UsersModule, EntradasModule, GastosModule, RegrasModule],
  controllers: [RelatoriosController],
  providers: [RelatoriosService],
})
export class RelatoriosModule {}
