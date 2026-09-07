import { calcularCotas, entradaDoMes, entradaRecorrente, fixosIndividuais } from './calcular-cotas';
import type { ContextoRateio, EntradaCalc, GastoCalc, RegraCalc } from './tipos';

const MES = '2026-09';

const entradas: EntradaCalc[] = [
  { userId: 'u1', tipo: 'recorrente', valorCentavos: 620000 },
  { userId: 'u1', tipo: 'pontual', valorCentavos: 140000, data: '2026-09-18' },
  { userId: 'u2', tipo: 'recorrente', valorCentavos: 410000 },
  { userId: 'u3', tipo: 'recorrente', valorCentavos: 330000 },
  { userId: 'u3', tipo: 'pontual', valorCentavos: 85000, data: '2026-08-09' },
];

const gasto = (over: Partial<GastoCalc> = {}): GastoCalc => ({
  id: 'g', userId: 'u1', mes: MES, categoria: 'casa', tipoGasto: 'fixo',
  valorCentavos: 10000, dividir: true, participantes: ['u1', 'u2'], regraId: null,
  ...over,
});

const regras: RegraCalc[] = [
  { id: 'r1', tipo: 'igual' },
  { id: 'r2', tipo: 'renda' },
  { id: 'r3', tipo: 'sobra' },
  { id: 'r4', tipo: 'fixo', pesos: { u1: 60, u2: 40, u3: 0 } },
  { id: 'r5', tipo: 'medidor', medicoes: { '2026-09': { u1: 320, u2: 780, u3: 0 } } },
  { id: 'r6', tipo: 'medidor', medicoes: {} },
];

const ctx = (gastos: GastoCalc[] = []): ContextoRateio => ({ regras, entradas, gastos, mes: MES });
const soma = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);

describe('entradas', () => {
  it('soma recorrente todo mês e pontual só no mês da data', () => {
    expect(entradaDoMes(entradas, 'u1', MES)).toBe(760000);
    expect(entradaDoMes(entradas, 'u3', MES)).toBe(330000); // pontual é de agosto
    expect(entradaDoMes(entradas, 'u3', '2026-08')).toBe(415000);
  });

  it('entradaRecorrente ignora pontuais', () => {
    expect(entradaRecorrente(entradas, 'u1')).toBe(620000);
  });
});

describe('fixosIndividuais', () => {
  it('conta só gasto fixo, individual e do mês', () => {
    const gastos = [
      gasto({ userId: 'u1', dividir: false, tipoGasto: 'fixo', valorCentavos: 12900 }),
      gasto({ userId: 'u1', dividir: false, tipoGasto: 'opcional', valorCentavos: 24900 }),
      gasto({ userId: 'u1', dividir: true, tipoGasto: 'fixo', valorCentavos: 240000 }),
      gasto({ userId: 'u1', dividir: false, tipoGasto: 'fixo', valorCentavos: 5000, mes: '2026-08' }),
    ];
    expect(fixosIndividuais(gastos, 'u1', MES)).toBe(12900);
  });
});

describe('calcularCotas — as 5 bases de rateio', () => {
  it('igual: partes iguais entre os participantes', () => {
    const c = calcularCotas(gasto({ regraId: 'r1', participantes: ['u1', 'u2', 'u3'] }), ctx());
    expect(c).toEqual({ u1: 1 / 3, u2: 1 / 3, u3: 1 / 3 });
  });

  it('renda: proporcional à entrada recorrente, ignorando a pontual', () => {
    const c = calcularCotas(gasto({ regraId: 'r2', participantes: ['u1', 'u2'] }), ctx());
    expect(c.u1).toBeCloseTo(620000 / 1030000, 10);
    expect(c.u2).toBeCloseTo(410000 / 1030000, 10);
    expect(soma(c)).toBeCloseTo(1, 10);
  });

  it('sobra: renda recorrente menos os fixos individuais do mês', () => {
    const gastos = [
      gasto({ userId: 'u1', dividir: false, tipoGasto: 'fixo', valorCentavos: 120000 }),
      gasto({ userId: 'u2', dividir: false, tipoGasto: 'fixo', valorCentavos: 10000 }),
    ];
    const c = calcularCotas(gasto({ regraId: 'r3', participantes: ['u1', 'u2'] }), ctx(gastos));
    expect(c.u1).toBeCloseTo(500000 / 900000, 10);
    expect(c.u2).toBeCloseTo(400000 / 900000, 10);
  });

  it('sobra: gasto compartilhado NÃO entra na base (evita cota que depende de si mesma)', () => {
    const compartilhado = [
      gasto({ userId: 'u1', dividir: true, tipoGasto: 'fixo', valorCentavos: 240000 }),
    ];
    const semNada = calcularCotas(gasto({ regraId: 'r3', participantes: ['u1', 'u2'] }), ctx());
    const comCompartilhado = calcularCotas(
      gasto({ regraId: 'r3', participantes: ['u1', 'u2'] }), ctx(compartilhado),
    );
    expect(comCompartilhado).toEqual(semNada);
  });

  it('sobra: nunca gera peso negativo quando o fixo supera a renda', () => {
    const gastos = [
      gasto({ userId: 'u1', dividir: false, tipoGasto: 'fixo', valorCentavos: 900000 }),
    ];
    const c = calcularCotas(gasto({ regraId: 'r3', participantes: ['u1', 'u2'] }), ctx(gastos));
    expect(c.u1).toBe(0);
    expect(c.u2).toBe(1);
  });

  it('fixo: usa os percentuais combinados, normalizados entre quem participa', () => {
    const c = calcularCotas(gasto({ regraId: 'r4', participantes: ['u1', 'u2'] }), ctx());
    expect(c.u1).toBeCloseTo(0.6, 10);
    expect(c.u2).toBeCloseTo(0.4, 10);
  });

  it('fixo: renormaliza quando um dos combinados fica fora do gasto', () => {
    // u1=60 e u3=0 participam; soma 60 → u1 leva tudo.
    const c = calcularCotas(gasto({ regraId: 'r4', participantes: ['u1', 'u3'] }), ctx());
    expect(c).toEqual({ u1: 1, u3: 0 });
  });

  it('medidor: converte a medição do mês em percentual', () => {
    const c = calcularCotas(gasto({ regraId: 'r5', participantes: ['u1', 'u2'] }), ctx());
    expect(c.u1).toBeCloseTo(320 / 1100, 10);
    expect(c.u2).toBeCloseTo(780 / 1100, 10);
  });

  it('medidor: sem medição no mês, cai para partes iguais', () => {
    const c = calcularCotas(gasto({ regraId: 'r6', participantes: ['u1', 'u2'] }), ctx());
    expect(c).toEqual({ u1: 0.5, u2: 0.5 });
  });

  it('regra inexistente cai para partes iguais', () => {
    const c = calcularCotas(gasto({ regraId: 'nao-existe', participantes: ['u1', 'u2'] }), ctx());
    expect(c).toEqual({ u1: 0.5, u2: 0.5 });
  });

  it('sem participantes, a cota inteira é de quem pagou', () => {
    const c = calcularCotas(gasto({ regraId: 'r1', participantes: [] }), ctx());
    expect(c).toEqual({ u1: 1 });
  });

  it('toda base de rateio devolve frações que somam 1', () => {
    for (const r of regras) {
      const c = calcularCotas(gasto({ regraId: r.id, participantes: ['u1', 'u2', 'u3'] }), ctx());
      expect(soma(c)).toBeCloseTo(1, 10);
    }
  });
});
