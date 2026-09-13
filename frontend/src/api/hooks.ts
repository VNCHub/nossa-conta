import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import type {
  StatementDTO,
  IncomeDTO,
  FamilyDTO,
  ExpenseDTO,
  MemberDTO,
  RuleDTO,
  ImportedFileDTO,
} from '@shared/contracts';
import { api } from './client';

export const keys = {
  family: ['family'] as const,
  members: ['members'] as const,
  incomes: ['incomes'] as const,
  rules: ['rules'] as const,
  expenses: (month: string) => ['expenses', month] as const,
  statement: (month: string) => ['statement', month] as const,
  imports: ['imports'] as const,
};

export const useFamily = () =>
  useQuery({ queryKey: keys.family, queryFn: () => api.get<FamilyDTO>('/familias/minha') });

export const useMembers = () =>
  useQuery({
    queryKey: keys.members,
    queryFn: () => api.get<MemberDTO[]>('/familias/minha/membros'),
  });

export const useIncomes = () =>
  useQuery({ queryKey: keys.incomes, queryFn: () => api.get<IncomeDTO[]>('/entradas') });

export const useRules = () =>
  useQuery({ queryKey: keys.rules, queryFn: () => api.get<RuleDTO[]>('/regras') });

export const useExpenses = (month: string) =>
  useQuery({
    queryKey: keys.expenses(month),
    queryFn: () => api.get<ExpenseDTO[]>(`/gastos?mes=${month}`),
  });

export const useStatement = (month: string) =>
  useQuery({
    queryKey: keys.statement(month),
    queryFn: () => api.get<StatementDTO>(`/relatorios/consolidado?mes=${month}`),
  });

export const useImports = () =>
  useQuery({
    queryKey: keys.imports,
    queryFn: () => api.get<ImportedFileDTO[]>('/gastos/importacoes'),
  });

/**
 * Any write touches the month's statement, so every mutation invalidates the
 * affected keys — that is what keeps the dashboard, table and settlement telling
 * the same story.
 */
export function useAppMutation<TData, TVars>(
  fn: (vars: TVars) => Promise<TData>,
  invalidate: readonly (readonly unknown[])[],
  options?: Omit<UseMutationOptions<TData, Error, TVars>, 'mutationFn'>,
) {
  const qc = useQueryClient();
  return useMutation<TData, Error, TVars>({
    mutationFn: fn,
    ...options,
    onSuccess: (...args: Parameters<NonNullable<typeof options>['onSuccess'] & object>) => {
      invalidate.forEach((queryKey) => void qc.invalidateQueries({ queryKey }));
      options?.onSuccess?.(...args);
    },
  });
}
