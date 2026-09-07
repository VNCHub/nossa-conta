/**
 * Dinheiro é sempre um inteiro de centavos dentro do motor de cálculo.
 * Float em rateio significa centavo perdido no acerto do mês — e num app
 * onde três pessoas dividem contas, o centavo perdido é reclamação real.
 */

export const paraCentavos = (reais: number | string): number => {
  const n = typeof reais === 'string' ? Number(reais) : reais;
  if (!n || !Number.isFinite(n)) return 0;

  // Multiplicar por 100 erra: 1.005 * 100 dá 100.49999999999999 e arredonda pra
  // baixo. Reinterpretar a representação decimal desloca a vírgula sem passar
  // pelo erro de ponto flutuante. Sinal tratado à parte para que -1.005 e 1.005
  // arredondem para o mesmo lado.
  const sinal = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const decimal = `${abs}`;
  const deslocado = decimal.includes('e') ? abs * 100 : Number(`${decimal}e2`);
  return sinal * Math.round(deslocado);
};

export const paraReais = (centavos: number): number => centavos / 100;

/**
 * Reparte `totalCentavos` entre participantes conforme frações que somam 1.
 *
 * Usa o método do maior resto: cada um leva o piso da sua parte e os centavos
 * que sobram vão, um a um, para quem ficou com o maior resto. Garante que a
 * soma das cotas devolvidas é exatamente `totalCentavos` — nunca um centavo a
 * mais ou a menos, para qualquer combinação de valor e número de pessoas.
 */
export function distribuirCentavos(
  totalCentavos: number,
  fracoes: Record<string, number>,
): Record<string, number> {
  const ids = Object.keys(fracoes);
  if (ids.length === 0) return {};

  const sinal = totalCentavos < 0 ? -1 : 1;
  const total = Math.abs(totalCentavos);

  const brutos = ids.map((id) => {
    const exato = total * (fracoes[id] ?? 0);
    const piso = Math.floor(exato);
    return { id, piso, resto: exato - piso };
  });

  let sobra = total - brutos.reduce((s, b) => s + b.piso, 0);

  // Maior resto primeiro; empate desfeito pela maior fração e depois pelo id,
  // para que o resultado seja idêntico a cada recálculo do mesmo mês.
  brutos.sort(
    (a, b) =>
      b.resto - a.resto ||
      (fracoes[b.id] ?? 0) - (fracoes[a.id] ?? 0) ||
      a.id.localeCompare(b.id),
  );

  const saida: Record<string, number> = {};
  for (const b of brutos) {
    const extra = sobra > 0 ? 1 : 0;
    sobra -= extra;
    saida[b.id] = sinal * (b.piso + extra);
  }
  return saida;
}
