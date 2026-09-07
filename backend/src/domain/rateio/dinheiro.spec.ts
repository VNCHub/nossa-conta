import { distribuirCentavos, paraCentavos, paraReais } from './dinheiro';

const soma = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);

describe('paraCentavos', () => {
  it('converte reais para inteiro de centavos', () => {
    expect(paraCentavos(129.9)).toBe(12990);
    expect(paraCentavos('0.1')).toBe(10);
    expect(paraCentavos(0)).toBe(0);
  });

  it('não perde centavo na representação binária de floats', () => {
    // 1.005 * 100 dá 100.49999... em float; o Math.round protege isso.
    expect(paraCentavos(1.005)).toBe(101);
    expect(paraCentavos(8.7)).toBe(870);
    expect(paraReais(12990)).toBe(129.9);
  });
});

describe('distribuirCentavos', () => {
  it('fecha exatamente o total em R$ 100,00 divididos por 3', () => {
    const cotas = distribuirCentavos(10000, { a: 1 / 3, b: 1 / 3, c: 1 / 3 });
    expect(soma(cotas)).toBe(10000);
    expect(Object.values(cotas).sort()).toEqual([3333, 3333, 3334]);
  });

  it('fecha o total para qualquer valor entre 1 e 2000 centavos, em 2 a 5 pessoas', () => {
    for (let pessoas = 2; pessoas <= 5; pessoas++) {
      const fracoes = Object.fromEntries(
        Array.from({ length: pessoas }, (_, i) => [`u${i}`, 1 / pessoas]),
      );
      for (let total = 1; total <= 2000; total++) {
        expect(soma(distribuirCentavos(total, fracoes))).toBe(total);
      }
    }
  });

  it('fecha o total com frações irregulares', () => {
    const cotas = distribuirCentavos(28590, { a: 0.4137, b: 0.2931, c: 0.2932 });
    expect(soma(cotas)).toBe(28590);
  });

  it('dá o centavo que sobra a quem tem o maior resto', () => {
    const cotas = distribuirCentavos(10, { a: 0.5, b: 0.25, c: 0.25 });
    expect(cotas).toEqual({ a: 5, b: 3, c: 2 });
    expect(soma(cotas)).toBe(10);
  });

  it('é determinístico: o mesmo mês recalculado dá o mesmo resultado', () => {
    const fracoes = { zeca: 1 / 3, ana: 1 / 3, bia: 1 / 3 };
    const primeira = distribuirCentavos(10000, fracoes);
    for (let i = 0; i < 20; i++) {
      expect(distribuirCentavos(10000, fracoes)).toEqual(primeira);
    }
  });

  it('devolve objeto vazio sem participantes', () => {
    expect(distribuirCentavos(1000, {})).toEqual({});
  });
});
