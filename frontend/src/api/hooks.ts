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
  AdminOverviewDTO,
  AdminUserDTO,
  PaginatedDTO,
  ErrorIssueDTO,
  ErrorIssueDetailDTO,
  SessionDTO,
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
  adminOverview: ['admin', 'overview'] as const,
  adminUsers: (page: number) => ['admin', 'users', page] as const,
  errorIssues: (page: number) => ['errors', 'issues', page] as const,
  errorIssueDetail: (id: string, page: number) => ['errors', 'issue', id, page] as const,
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

export const useAdminOverview = () =>
  useQuery({
    queryKey: keys.adminOverview,
    queryFn: () => api.get<AdminOverviewDTO>('/administracao/resumo'),
  });

export const useAdminUsers = (page: number, pageSize = 20) =>
  useQuery({
    queryKey: keys.adminUsers(page),
    queryFn: () =>
      api.get<PaginatedDTO<AdminUserDTO>>(`/administracao/usuarios?page=${page}&pageSize=${pageSize}`),
  });

export const useErrorIssues = (page: number, pageSize = 20) =>
  useQuery({
    queryKey: keys.errorIssues(page),
    queryFn: () => api.get<PaginatedDTO<ErrorIssueDTO>>(`/erros?page=${page}&pageSize=${pageSize}`),
  });

export const useErrorIssueDetail = (issueId: string | null, page: number, pageSize = 20) =>
  useQuery({
    queryKey: keys.errorIssueDetail(issueId ?? '', page),
    queryFn: () => api.get<ErrorIssueDetailDTO>(`/erros/${issueId}?page=${page}&pageSize=${pageSize}`),
    enabled: !!issueId,
  });

export const useForgotPassword = () =>
  useAppMutation(
    (email: string) => api.post<{ message: string }>('/auth/esqueci-senha', { email }),
    [],
  );

export const useResetPassword = () =>
  useAppMutation(
    (data: { token: string; newPassword: string }) =>
      api.post<{ message: string }>('/auth/redefinir-senha', data),
    [],
  );

export const useUpdateProfile = () =>
  useAppMutation(
    (data: { name?: string; currentPassword?: string; newPassword?: string }) =>
      api.patch<SessionDTO['user']>('/auth/perfil', data),
    [],
  );

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
