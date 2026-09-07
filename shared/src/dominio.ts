/**
 * Constantes de domínio compartilhadas entre backend e frontend.
 * Origem: docs/prototipo.jsx (CATEGORIAS, PAGAMENTOS, MESES).
 */

export const CATEGORIAS = [
  { id: 'carro', nome: 'Carro', cor: '#3D6A8F' },
  { id: 'casa', nome: 'Casa', cor: '#2F6F5E' },
  { id: 'passeio', nome: 'Passeio', cor: '#C97B2B' },
  { id: 'assinaturas', nome: 'Assinaturas', cor: '#7A5AA6' },
  { id: 'comida', nome: 'Comida', cor: '#B8452F' },
  { id: 'pets', nome: 'Pets', cor: '#4E9A8A' },
  { id: 'jogos', nome: 'Jogos', cor: '#5A6EA8' },
  { id: 'outros', nome: 'Outros', cor: '#8A8F87' },
] as const;

export type CategoriaId = (typeof CATEGORIAS)[number]['id'];
export const CATEGORIA_IDS = CATEGORIAS.map((c) => c.id) as CategoriaId[];
export const catOf = (id: string) =>
  CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];

export const PAGAMENTOS = ['Crédito', 'Débito', 'Dinheiro', 'Pix'] as const;
export type Pagamento = (typeof PAGAMENTOS)[number];

export const TIPOS_GASTO = ['fixo', 'opcional'] as const;
export type TipoGasto = (typeof TIPOS_GASTO)[number];

export const TIPOS_ENTRADA = ['recorrente', 'pontual'] as const;
export type TipoEntrada = (typeof TIPOS_ENTRADA)[number];

/** Bases de cálculo de rateio. Ver docs/prototipo.jsx:297-319. */
export const TIPOS_REGRA = ['igual', 'renda', 'sobra', 'fixo', 'medidor'] as const;
export type TipoRegra = (typeof TIPOS_REGRA)[number];

export const DESCRICAO_PADRAO_REGRA: Record<TipoRegra, string> = {
  igual: 'Divide igualmente entre quem participa.',
  renda: 'Cada um paga na proporção da sua entrada recorrente.',
  sobra: 'Proporção da renda recorrente menos os gastos fixos individuais.',
  fixo: 'Percentuais combinados uma vez.',
  medidor: 'Todo mês cada um lança sua medição; o sistema converte em percentual.',
};

export const CORES_MEMBRO = [
  '#1F5F52', '#B8452F', '#7A5AA6', '#3D6A8F',
  '#C97B2B', '#4E9A8A', '#5A6EA8', '#8A8F87',
];

export const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** Competência no formato YYYY-MM. */
export type Mes = string;
export const MES_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
