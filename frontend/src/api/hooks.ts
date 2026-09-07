import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import type {
  ConsolidadoDTO,
  EntradaDTO,
  FamiliaDTO,
  GastoDTO,
  MembroDTO,
  RegraDTO,
} from '@shared/contratos';
import { api } from './client';

export const chaves = {
  familia: ['familia'] as const,
  membros: ['membros'] as const,
  entradas: ['entradas'] as const,
  regras: ['regras'] as const,
  gastos: (mes: string) => ['gastos', mes] as const,
  consolidado: (mes: string) => ['consolidado', mes] as const,
};

export const useFamilia = () =>
  useQuery({ queryKey: chaves.familia, queryFn: () => api.get<FamiliaDTO>('/familias/minha') });

export const useMembros = () =>
  useQuery({
    queryKey: chaves.membros,
    queryFn: () => api.get<MembroDTO[]>('/familias/minha/membros'),
  });

export const useEntradas = () =>
  useQuery({ queryKey: chaves.entradas, queryFn: () => api.get<EntradaDTO[]>('/entradas') });

export const useRegras = () =>
  useQuery({ queryKey: chaves.regras, queryFn: () => api.get<RegraDTO[]>('/regras') });

export const useGastos = (mes: string) =>
  useQuery({
    queryKey: chaves.gastos(mes),
    queryFn: () => api.get<GastoDTO[]>(`/gastos?mes=${mes}`),
  });

export const useConsolidado = (mes: string) =>
  useQuery({
    queryKey: chaves.consolidado(mes),
    queryFn: () => api.get<ConsolidadoDTO>(`/relatorios/consolidado?mes=${mes}`),
  });

/**
 * Qualquer escrita mexe no consolidado do mês, então toda mutation invalida as
 * chaves afetadas — é o que mantém painel, tabela e acerto contando a mesma história.
 */
export function useMutacao<TDados, TVars>(
  fn: (vars: TVars) => Promise<TDados>,
  invalidar: readonly (readonly unknown[])[],
  opcoes?: Omit<UseMutationOptions<TDados, Error, TVars>, 'mutationFn'>,
) {
  const qc = useQueryClient();
  return useMutation<TDados, Error, TVars>({
    mutationFn: fn,
    ...opcoes,
    onSuccess: (...args: Parameters<NonNullable<typeof opcoes>['onSuccess'] & object>) => {
      invalidar.forEach((queryKey) => void qc.invalidateQueries({ queryKey }));
      opcoes?.onSuccess?.(...args);
    },
  });
}
