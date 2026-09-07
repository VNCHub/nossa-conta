/**
 * Domain constants shared between backend and frontend.
 * Source: docs/prototipo.jsx (CATEGORIAS, PAGAMENTOS, MESES).
 */

export const CATEGORIES = [
  { id: 'car', name: 'Carro', color: '#3D6A8F' },
  { id: 'home', name: 'Casa', color: '#2F6F5E' },
  { id: 'outing', name: 'Passeio', color: '#C97B2B' },
  { id: 'subscriptions', name: 'Assinaturas', color: '#7A5AA6' },
  { id: 'food', name: 'Comida', color: '#B8452F' },
  { id: 'pets', name: 'Pets', color: '#4E9A8A' },
  { id: 'games', name: 'Jogos', color: '#5A6EA8' },
  { id: 'other', name: 'Outros', color: '#8A8F87' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];
export const categoryOf = (id: string) =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export const PAYMENT_METHODS = ['Crédito', 'Débito', 'Dinheiro', 'Pix'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EXPENSE_TYPES = ['fixed', 'optional'] as const;
export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const INCOME_TYPES = ['recurring', 'oneOff'] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

/** Split calculation bases. See docs/prototipo.jsx:297-319. */
export const RULE_TYPES = ['equal', 'income', 'surplus', 'fixed', 'meter'] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export const DEFAULT_RULE_DESCRIPTION: Record<RuleType, string> = {
  equal: 'Divide igualmente entre quem participa.',
  income: 'Cada um paga na proporção da sua entrada recorrente.',
  surplus: 'Proporção da renda recorrente menos os gastos fixos individuais.',
  fixed: 'Percentuais combinados uma vez.',
  meter: 'Todo mês cada um lança sua medição; o sistema converte em percentual.',
};

export const MEMBER_COLORS = [
  '#1F5F52', '#B8452F', '#7A5AA6', '#3D6A8F',
  '#C97B2B', '#4E9A8A', '#5A6EA8', '#8A8F87',
];

export const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** Accounting period in YYYY-MM format. */
export type Month = string;
export const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
