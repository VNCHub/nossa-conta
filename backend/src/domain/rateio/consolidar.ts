/**
 * Consolidação mensal — portado de docs/prototipo.jsx:321-369, em centavos.
 */
import { calcularCotas, entradaDoMes } from './calcular-cotas';
import { distribuirCentavos } from './dinheiro';
import type {
  ConsolidadoCalc,
  ContextoRateio,
  EntradaCalc,
  GastoCalc,
  LinhaCalc,
  RegraCalc,
  ResumoUsuarioCalc,
  TransferenciaCalc,
} from './tipos';

const resumoVazio = (entradaCentavos: number): ResumoUsuarioCalc => ({
  pagoCentavos: 0,
  cotaCentavos: 0,
  fixoCentavos: 0,
  opcionalCentavos: 0,
  entradaCentavos,
  categoriasCentavos: {},
});

export function consolidar(input: {
  membros: { id: string }[];
  entradas: EntradaCalc[];
  gastos: GastoCalc[];
  regras: RegraCalc[];
  mes: string;
}): ConsolidadoCalc {
  const { membros, entradas, gastos, regras, mes } = input;
  const doMes = gastos.filter((g) => g.mes === mes);
  const ctx: ContextoRateio = { regras, entradas, gastos, mes };

  const porUsuario: Record<string, ResumoUsuarioCalc> = Object.fromEntries(
    membros.map((u) => [u.id, resumoVazio(entradaDoMes(entradas, u.id, mes))]),
  );
  const saldoCentavos: Record<string, number> = Object.fromEntries(
    membros.map((u) => [u.id, 0]),
  );

  const linhas: LinhaCalc[] = doMes.map((g) => {
    const cotas = g.dividir ? calcularCotas(g, ctx) : { [g.userId]: 1 };
    const cotasCentavos = distribuirCentavos(g.valorCentavos, cotas);

    if (porUsuario[g.userId]) porUsuario[g.userId].pagoCentavos += g.valorCentavos;

    for (const [participante, valor] of Object.entries(cotasCentavos)) {
      const alvo = porUsuario[participante];
      // Participante que saiu da família continua no gasto histórico, mas não
      // entra mais no consolidado nem no acerto do mês.
      if (!alvo) continue;

      alvo.cotaCentavos += valor;
      if (g.tipoGasto === 'fixo') alvo.fixoCentavos += valor;
      else alvo.opcionalCentavos += valor;
      alvo.categoriasCentavos[g.categoria] =
        (alvo.categoriasCentavos[g.categoria] ?? 0) + valor;

      if (participante !== g.userId) {
        saldoCentavos[participante] -= valor;
        saldoCentavos[g.userId] = (saldoCentavos[g.userId] ?? 0) + valor;
      }
    }

    return { ...g, cotas, cotasCentavos };
  });

  return {
    mes,
    linhas,
    porUsuario,
    saldoCentavos,
    transferencias: acertar(saldoCentavos),
    totalMesCentavos: doMes.reduce((s, g) => s + g.valorCentavos, 0),
  };
}

/**
 * Acerto do mês: casa o maior devedor com o maior credor até zerar todo mundo.
 * Guloso, e por isso não garante o mínimo teórico de transferências — mas com
 * uma família de 2 a 5 pessoas ele produz o mínimo na prática, e é previsível
 * de explicar para quem vai pagar.
 */
export function acertar(saldo: Record<string, number>): TransferenciaCalc[] {
  const devedores = Object.entries(saldo)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, v: -v }))
    .sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
  const credores = Object.entries(saldo)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, v }))
    .sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));

  const transferencias: TransferenciaCalc[] = [];
  let i = 0;
  let j = 0;
  while (i < devedores.length && j < credores.length) {
    const valorCentavos = Math.min(devedores[i].v, credores[j].v);
    if (valorCentavos > 0) {
      transferencias.push({
        de: devedores[i].id,
        para: credores[j].id,
        valorCentavos,
      });
    }
    devedores[i].v -= valorCentavos;
    credores[j].v -= valorCentavos;
    if (devedores[i].v === 0) i++;
    if (credores[j].v === 0) j++;
  }
  return transferencias;
}
