import { Injectable } from '@nestjs/common';
import type { ConsolidadoDTO, ResumoUsuario } from '@shared/contratos';
import { consolidar, paraReais } from '../../domain/rateio';
import { EntradasService } from '../entradas/entradas.service';
import { GastosService } from '../gastos/gastos.service';
import { RegrasService } from '../regras/regras.service';
import { UsersRepository } from '../users/users.repository';

/**
 * Ponte entre o banco e o motor de rateio.
 *
 * O cálculo roda no servidor de propósito: é fonte única de verdade para todos
 * os membros e ninguém consegue alterar a própria cota mexendo no cliente.
 */
@Injectable()
export class RelatoriosService {
  constructor(
    private readonly users: UsersRepository,
    private readonly entradas: EntradasService,
    private readonly gastos: GastosService,
    private readonly regras: RegrasService,
  ) {}

  async consolidado(familiaId: string, mes: string): Promise<ConsolidadoDTO> {
    const [membros, entradas, gastos, regras] = await Promise.all([
      this.users.listarMembros(familiaId),
      this.entradas.paraCalculo(familiaId),
      this.gastos.paraRelatorio(familiaId),
      this.regras.paraCalculo(familiaId),
    ]);

    const calc = consolidar({
      membros,
      entradas,
      gastos: gastos.calc,
      regras,
      mes,
    });

    return {
      mes: calc.mes,
      totalMes: paraReais(calc.totalMesCentavos),
      linhas: calc.linhas.map((l) => ({
        ...gastos.dto.get(l.id)!,
        cotas: l.cotas,
      })),
      porUsuario: Object.fromEntries(
        Object.entries(calc.porUsuario).map(([id, u]): [string, ResumoUsuario] => [
          id,
          {
            pago: paraReais(u.pagoCentavos),
            cota: paraReais(u.cotaCentavos),
            fixo: paraReais(u.fixoCentavos),
            opcional: paraReais(u.opcionalCentavos),
            entrada: paraReais(u.entradaCentavos),
            categorias: Object.fromEntries(
              Object.entries(u.categoriasCentavos).map(([c, v]) => [c, paraReais(v)]),
            ),
          },
        ]),
      ),
      saldo: Object.fromEntries(
        Object.entries(calc.saldoCentavos).map(([id, v]) => [id, paraReais(v)]),
      ),
      transferencias: calc.transferencias.map((t) => ({
        de: t.de,
        para: t.para,
        valor: paraReais(t.valorCentavos),
      })),
    };
  }
}
