import type { TipoEntrada, TipoGasto, TipoRegra } from '@shared/dominio';

/** Entradas de um membro, já convertidas para centavos. */
export interface EntradaCalc {
  userId: string;
  tipo: TipoEntrada;
  valorCentavos: number;
  /** YYYY-MM-DD — só existe em entrada pontual */
  data?: string | null;
}

export interface GastoCalc {
  id: string;
  userId: string;
  /** competência YYYY-MM */
  mes: string;
  categoria: string;
  tipoGasto: TipoGasto;
  valorCentavos: number;
  dividir: boolean;
  participantes: string[];
  regraId: string | null;
}

export interface RegraCalc {
  id: string;
  tipo: TipoRegra;
  /** tipo = fixo — percentual combinado por membro */
  pesos?: Record<string, number>;
  /** tipo = medidor — { 'YYYY-MM': { userId: medição } } */
  medicoes?: Record<string, Record<string, number>>;
}

export interface ContextoRateio {
  regras: RegraCalc[];
  entradas: EntradaCalc[];
  gastos: GastoCalc[];
  mes: string;
}

export interface ResumoUsuarioCalc {
  pagoCentavos: number;
  cotaCentavos: number;
  fixoCentavos: number;
  opcionalCentavos: number;
  entradaCentavos: number;
  categoriasCentavos: Record<string, number>;
}

export interface TransferenciaCalc {
  de: string;
  para: string;
  valorCentavos: number;
}

export interface LinhaCalc extends GastoCalc {
  /** fração de cada participante (soma 1) */
  cotas: Record<string, number>;
  /** valor exato em centavos de cada participante (soma = valorCentavos) */
  cotasCentavos: Record<string, number>;
}

export interface ConsolidadoCalc {
  mes: string;
  linhas: LinhaCalc[];
  porUsuario: Record<string, ResumoUsuarioCalc>;
  saldoCentavos: Record<string, number>;
  transferencias: TransferenciaCalc[];
  totalMesCentavos: number;
}
