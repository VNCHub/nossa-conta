/**
 * Contrato da API v1 — o mesmo shape produzido pelo backend e consumido pelo front.
 * Valores monetários trafegam como number em reais (já convertidos de centavos).
 */
import type { CategoriaId, Pagamento, TipoEntrada, TipoGasto, TipoRegra } from './dominio';

export interface MembroDTO {
  id: string;
  nome: string;
  email: string;
  cor: string;
}

export interface FamiliaDTO {
  id: string;
  nome: string;
  codigoConvite: string;
  criadaPorId: string;
}

export interface EntradaDTO {
  id: string;
  userId: string;
  tipo: TipoEntrada;
  descricao: string;
  valor: number;
  /** presente quando tipo = recorrente */
  diaDoMes?: number | null;
  /** presente quando tipo = pontual (YYYY-MM-DD) */
  data?: string | null;
}

export interface GastoDTO {
  id: string;
  userId: string;
  data: string;
  pagamento: Pagamento;
  categoria: CategoriaId;
  tipoGasto: TipoGasto;
  descricao: string;
  valor: number;
  dividir: boolean;
  participantes: string[];
  regraId: string | null;
}

export interface RegraDTO {
  id: string;
  nome: string;
  tipo: TipoRegra;
  descricao: string;
  unidade?: string | null;
  /** tipo = fixo: percentual combinado por membro */
  pesos?: Record<string, number>;
  /** tipo = medidor: { 'YYYY-MM': { userId: valor } } */
  medicoes?: Record<string, Record<string, number>>;
  /** quantos gastos já usam esta regra (bloqueia exclusão) */
  emUso?: number;
}

/** Gasto acrescido do percentual de cada participante no mês consultado. */
export interface LinhaConsolidada extends GastoDTO {
  cotas: Record<string, number>;
}

export interface ResumoUsuario {
  pago: number;
  cota: number;
  fixo: number;
  opcional: number;
  entrada: number;
  categorias: Record<string, number>;
}

export interface Transferencia {
  de: string;
  para: string;
  valor: number;
}

/** Saída de GET /relatorios/consolidado — equivale ao consolidar() do protótipo. */
export interface ConsolidadoDTO {
  mes: string;
  linhas: LinhaConsolidada[];
  porUsuario: Record<string, ResumoUsuario>;
  saldo: Record<string, number>;
  transferencias: Transferencia[];
  totalMes: number;
}

export interface SessaoDTO {
  accessToken: string;
  user: MembroDTO & { familiaId: string | null };
}
