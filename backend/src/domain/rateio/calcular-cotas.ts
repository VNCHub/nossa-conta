/**
 * Motor de rateio — portado de docs/prototipo.jsx:278-319, com aritmética em centavos.
 * Funções puras: nenhum acesso a banco, HTTP ou Nest. É o que permite testá-las
 * exaustivamente em milissegundos, que é exatamente o que se quer da parte do
 * sistema que decide quanto cada pessoa paga.
 */
import type { ContextoRateio, EntradaCalc, GastoCalc, RegraCalc } from './tipos';

/** Recorrente vale todo mês; pontual só no mês da sua data. */
export function entradaDoMes(
  entradas: EntradaCalc[],
  userId: string,
  mes: string,
): number {
  return entradas
    .filter((e) => e.userId === userId)
    .filter((e) => e.tipo === 'recorrente' || (e.data ?? '').slice(0, 7) === mes)
    .reduce((s, e) => s + e.valorCentavos, 0);
}

export function entradaRecorrente(entradas: EntradaCalc[], userId: string): number {
  return entradas
    .filter((e) => e.userId === userId && e.tipo === 'recorrente')
    .reduce((s, e) => s + e.valorCentavos, 0);
}

/**
 * Gastos fixos individuais (não divididos) do mês — base da regra "sobra livre".
 *
 * Os gastos compartilhados ficam de fora de propósito: incluí-los criaria
 * dependência circular, porque a cota entraria no cálculo que define a cota.
 */
export function fixosIndividuais(
  gastos: GastoCalc[],
  userId: string,
  mes: string,
): number {
  return gastos
    .filter(
      (g) =>
        g.userId === userId && !g.dividir && g.tipoGasto === 'fixo' && g.mes === mes,
    )
    .reduce((s, g) => s + g.valorCentavos, 0);
}

/**
 * Fração de cada participante em um gasto, conforme a regra escolhida.
 * As frações sempre somam 1. Sem regra, ou sem dados no mês, cai para partes iguais.
 */
export function calcularCotas(
  gasto: Pick<GastoCalc, 'participantes' | 'userId' | 'regraId'>,
  ctx: ContextoRateio,
): Record<string, number> {
  const { regras, entradas, gastos, mes } = ctx;
  const parts = gasto.participantes.length ? gasto.participantes : [gasto.userId];
  const igual = (): Record<string, number> =>
    Object.fromEntries(parts.map((p) => [p, 1 / parts.length]));

  const regra: RegraCalc | undefined = regras.find((r) => r.id === gasto.regraId);
  if (!regra || regra.tipo === 'igual') return igual();

  let pesos: Record<string, number> = {};
  switch (regra.tipo) {
    case 'fixo':
      pesos = Object.fromEntries(parts.map((p) => [p, regra.pesos?.[p] ?? 0]));
      break;
    case 'renda':
      pesos = Object.fromEntries(
        parts.map((p) => [p, entradaRecorrente(entradas, p)]),
      );
      break;
    case 'sobra':
      pesos = Object.fromEntries(
        parts.map((p) => [
          p,
          Math.max(0, entradaRecorrente(entradas, p) - fixosIndividuais(gastos, p, mes)),
        ]),
      );
      break;
    case 'medidor':
      pesos = Object.fromEntries(
        parts.map((p) => [p, regra.medicoes?.[mes]?.[p] ?? 0]),
      );
      break;
  }

  const total = Object.values(pesos).reduce((s, v) => s + v, 0);
  if (!total) return igual();
  return Object.fromEntries(parts.map((p) => [p, pesos[p] / total]));
}
