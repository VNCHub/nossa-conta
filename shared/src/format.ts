import { MONTH_NAMES } from './domain';

export const brl = (n: number) =>
  (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const pct = (n: number) => `${(n * 100).toFixed(n * 100 >= 10 ? 0 : 1)}%`;

export const monthLabel = (m: string) => {
  const [year, month] = m.split('-');
  return `${MONTH_NAMES[+month - 1]} de ${year}`;
};

export const shiftMonth = (m: string, delta: number) => {
  const [year, month] = m.split('-').map(Number);
  const dt = new Date(year, month - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
