import { MESES } from './dominio';

export const brl = (n: number) =>
  (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const pct = (n: number) => `${(n * 100).toFixed(n * 100 >= 10 ? 0 : 1)}%`;

export const mesLabel = (m: string) => {
  const [a, b] = m.split('-');
  return `${MESES[+b - 1]} de ${a}`;
};

export const shiftMes = (m: string, d: number) => {
  const [a, b] = m.split('-').map(Number);
  const dt = new Date(a, b - 1 + d, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

export const mesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
