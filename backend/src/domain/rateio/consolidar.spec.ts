import { acertar, consolidar } from './consolidar';
import type { EntradaCalc, GastoCalc, RegraCalc } from './tipos';

const MES = '2026-09';
const membros = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }];

const g = (
  userId: string, tipoGasto: 'fixo' | 'opcional', categoria: string,
  valorCentavos: number, dividir: boolean, participantes: string[], regraId: string | null,
  mes = MES,
): GastoCalc => ({
  id: `g${Math.random()}`, userId, mes, categoria, tipoGasto,
  valorCentavos, dividir, participantes, regraId,
});

const regras: RegraCalc[] = [
  { id: 'r1', tipo: 'igual' },
  { id: 'r2', tipo: 'renda' },
  { id: 'r4', tipo: 'fixo', pesos: { u1: 60, u2: 40, u3: 0 } },
  { id: 'r5', tipo: 'medidor', medicoes: { '2026-09': { u1: 320, u2: 780, u3: 0 } } },
];

const entradas: EntradaCalc[] = [
  { userId: 'u1', tipo: 'recorrente', valorCentavos: 620000 },
  { userId: 'u1', tipo: 'pontual', valorCentavos: 140000, data: '2026-09-18' },
  { userId: 'u2', tipo: 'recorrente', valorCentavos: 410000 },
  { userId: 'u2', tipo: 'recorrente', valorCentavos: 70000 },
  { userId: 'u3', tipo: 'recorrente', valorCentavos: 330000 },
];

describe('consolidar — casos de mão', () => {
  it('R$ 100 pagos por u1 e divididos meio a meio: u2 deve R$ 50', () => {
    const r = consolidar({
      membros: membros.slice(0, 2), entradas: [], regras, mes: MES,
      gastos: [g('u1', 'fixo', 'casa', 10000, true, ['u1', 'u2'], 'r1')],
    });
    expect(r.porUsuario.u1.pagoCentavos).toBe(10000);
    expect(r.porUsuario.u1.cotaCentavos).toBe(5000);
    expect(r.porUsuario.u2.cotaCentavos).toBe(5000);
    expect(r.transferencias).toEqual([{ de: 'u2', para: 'u1', valorCentavos: 5000 }]);
  });

  it('R$ 100 divididos por 3: as cotas fecham 10000 centavos e o acerto zera', () => {
    const r = consolidar({
      membros, entradas: [], regras, mes: MES,
      gastos: [g('u1', 'fixo', 'casa', 10000, true, ['u1', 'u2', 'u3'], 'r1')],
    });
    const cotas = Object.values(r.porUsuario).map((u) => u.cotaCentavos).sort();
    expect(cotas).toEqual([3333, 3333, 3334]);
    expect(cotas.reduce((s, v) => s + v, 0)).toBe(10000);
    expect(r.transferencias).toEqual([
      { de: 'u2', para: 'u1', valorCentavos: 3333 },
      { de: 'u3', para: 'u1', valorCentavos: 3333 },
    ]);
  });

  it('gasto individual não gera acerto e vai só para a cota de quem pagou', () => {
    const r = consolidar({
      membros, entradas: [], regras, mes: MES,
      gastos: [g('u3', 'opcional', 'jogos', 24900, false, [], null)],
    });
    expect(r.porUsuario.u3.cotaCentavos).toBe(24900);
    expect(r.porUsuario.u3.opcionalCentavos).toBe(24900);
    expect(r.porUsuario.u1.cotaCentavos).toBe(0);
    expect(r.transferencias).toEqual([]);
  });

  it('só entram no consolidado os gastos do mês consultado', () => {
    const r = consolidar({
      membros, entradas: [], regras, mes: MES,
      gastos: [
        g('u1', 'fixo', 'casa', 10000, false, [], null),
        g('u1', 'fixo', 'casa', 99900, false, [], null, '2026-08'),
      ],
    });
    expect(r.totalMesCentavos).toBe(10000);
    expect(r.linhas).toHaveLength(1);
  });

  it('participante que saiu da família não quebra o consolidado', () => {
    const r = consolidar({
      membros: membros.slice(0, 2), entradas: [], regras, mes: MES,
      gastos: [g('u1', 'fixo', 'casa', 30000, true, ['u1', 'u2', 'u3'], 'r1')],
    });
    // A cota de u3 existe na linha, mas não conta em saldo nem em resumo.
    expect(r.linhas[0].cotasCentavos.u3).toBe(10000);
    expect(r.porUsuario.u3).toBeUndefined();
    expect(r.saldoCentavos.u3).toBeUndefined();
    expect(r.transferencias).toEqual([{ de: 'u2', para: 'u1', valorCentavos: 10000 }]);
  });
});

describe('consolidar — invariantes com um mês cheio', () => {
  const gastos = [
    g('u1', 'fixo', 'casa', 240000, true, ['u1', 'u2', 'u3'], 'r2'),
    g('u1', 'fixo', 'casa', 28500, true, ['u1', 'u2', 'u3'], 'r1'),
    g('u2', 'fixo', 'casa', 12990, true, ['u1', 'u2', 'u3'], 'r1'),
    g('u2', 'fixo', 'comida', 94000, true, ['u1', 'u2', 'u3'], 'r1'),
    g('u1', 'fixo', 'carro', 89000, true, ['u1', 'u2'], 'r4'),
    g('u2', 'fixo', 'carro', 32000, true, ['u1', 'u2'], 'r5'),
    g('u1', 'opcional', 'assinaturas', 5590, true, ['u1', 'u2', 'u3'], 'r1'),
    g('u3', 'fixo', 'pets', 21000, true, ['u1', 'u2', 'u3'], 'r1'),
    g('u1', 'opcional', 'jogos', 24900, false, [], null),
    g('u2', 'opcional', 'passeio', 31000, true, ['u1', 'u2'], 'r1'),
    g('u3', 'opcional', 'comida', 8750, false, [], null),
    g('u1', 'fixo', 'assinaturas', 12900, false, [], null),
  ];
  const r = consolidar({ membros, entradas, gastos, regras, mes: MES });

  it('a soma das cotas de cada gasto é exatamente o valor do gasto', () => {
    for (const linha of r.linhas) {
      const somaCotas = Object.values(linha.cotasCentavos).reduce((s, v) => s + v, 0);
      expect(somaCotas).toBe(linha.valorCentavos);
    }
  });

  it('a soma de todas as cotas é o total do mês — nenhum centavo criado ou perdido', () => {
    const totalCotas = Object.values(r.porUsuario).reduce((s, u) => s + u.cotaCentavos, 0);
    expect(totalCotas).toBe(r.totalMesCentavos);
    expect(r.totalMesCentavos).toBe(gastos.reduce((s, x) => s + x.valorCentavos, 0));
  });

  it('o que saiu do bolso menos a cota é exatamente o saldo de cada um', () => {
    for (const u of membros) {
      const { pagoCentavos, cotaCentavos } = r.porUsuario[u.id];
      expect(r.saldoCentavos[u.id]).toBe(pagoCentavos - cotaCentavos);
    }
  });

  it('os saldos somam zero: o que uns devem é o que os outros têm a receber', () => {
    expect(Object.values(r.saldoCentavos).reduce((s, v) => s + v, 0)).toBe(0);
  });

  it('fixo + opcional reconstrói a cota, e as categorias também', () => {
    for (const u of membros) {
      const d = r.porUsuario[u.id];
      expect(d.fixoCentavos + d.opcionalCentavos).toBe(d.cotaCentavos);
      const porCategoria = Object.values(d.categoriasCentavos).reduce((s, v) => s + v, 0);
      expect(porCategoria).toBe(d.cotaCentavos);
    }
  });

  it('as transferências quitam todo mundo e não passam de n-1', () => {
    const efeito: Record<string, number> = { u1: 0, u2: 0, u3: 0 };
    for (const t of r.transferencias) {
      efeito[t.de] += t.valorCentavos;
      efeito[t.para] -= t.valorCentavos;
      expect(t.valorCentavos).toBeGreaterThan(0);
    }
    for (const u of membros) expect(r.saldoCentavos[u.id] + efeito[u.id]).toBe(0);
    expect(r.transferencias.length).toBeLessThanOrEqual(membros.length - 1);
  });

  it('a entrada do mês soma recorrente + pontual do próprio mês', () => {
    expect(r.porUsuario.u1.entradaCentavos).toBe(760000);
    expect(r.porUsuario.u2.entradaCentavos).toBe(480000);
    expect(r.porUsuario.u3.entradaCentavos).toBe(330000);
  });
});

describe('acertar', () => {
  it('não gera transferência quando ninguém deve nada', () => {
    expect(acertar({ u1: 0, u2: 0 })).toEqual([]);
  });

  it('quita um devedor contra vários credores', () => {
    expect(acertar({ u1: -10000, u2: 6000, u3: 4000 })).toEqual([
      { de: 'u1', para: 'u2', valorCentavos: 6000 },
      { de: 'u1', para: 'u3', valorCentavos: 4000 },
    ]);
  });
});
