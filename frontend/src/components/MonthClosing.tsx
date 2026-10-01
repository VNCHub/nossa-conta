import { Badge, Button, Card, Group, Paper, SimpleGrid, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { monthLabel } from '@shared/format';
import { useFinalizeMonth, useMembers, useMonthStatus, useReopenMyMonth } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { notifyError, notifySuccess } from '../feedback';
import { Avatar } from './ui';

const finalizedOn = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

/** "Ana", "Ana e Bia", "Ana, Bia e Caio". */
const listNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;

/** Whether the signed-in member finalized `month` — their entries for it are frozen. */
export function useMyMonthLocked(month: string): boolean {
  const { user } = useAuth();
  const { data } = useMonthStatus(month);
  return !!(user && data?.finalized[user.id]);
}

const Eyebrow = ({ children }: { children: string }) => (
  <Text fz="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.06em' }}>
    {children}
  </Text>
);

/** "Meu painel": the member's own switch for the month. */
export function MyMonthCard({ month }: { month: string }) {
  const { user } = useAuth();
  const status = useMonthStatus(month);
  const finalize = useFinalizeMonth(month);
  const reopen = useReopenMyMonth(month);
  if (!status.data || !user) return null;

  const finalizedAt = status.data.finalized[user.id];

  const askFinalize = () =>
    modals.openConfirmModal({
      title: 'Finalizar meus lançamentos',
      children: (
        <Text size="sm">
          Você terminou de lançar seus gastos e entradas de {monthLabel(month)}? Depois de finalizar,
          eles ficam travados: nada de criar, editar ou excluir até você reabrir.
        </Text>
      ),
      labels: { confirm: 'Finalizar', cancel: 'Cancelar' },
      onConfirm: () =>
        finalize.mutate(undefined, {
          onSuccess: () => notifySuccess('Lançamentos finalizados'),
          onError: (e) => notifyError(e.message),
        }),
    });

  const doReopen = () =>
    reopen.mutate(undefined, {
      onSuccess: () => notifySuccess('Lançamentos reabertos. Seus gastos e entradas deste mês voltam a ser editáveis.'),
      onError: (e) => notifyError(e.message),
    });

  return (
    <Card
      mb="lg"
      // An open month is the call to action; once finalized it settles back into a plain card.
      style={finalizedAt ? undefined : { borderColor: 'var(--gf-credit)', boxShadow: '0 0 0 3px var(--mantine-color-petrol-0)' }}
    >
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Eyebrow>{`Seus lançamentos de ${monthLabel(month)}`}</Eyebrow>
          {finalizedAt ? (
            <Badge mt={6} color="petrol" variant="light" size="lg" tt="none">
              ✓ Finalizado em {finalizedOn(finalizedAt)}
            </Badge>
          ) : (
            <Title order={3} mt={4}>Ainda em aberto</Title>
          )}
        </div>
        {finalizedAt ? (
          <Button variant="default" onClick={doReopen} loading={reopen.isPending}>
            Reabrir meus lançamentos
          </Button>
        ) : (
          <Button onClick={askFinalize} loading={finalize.isPending}>
            Finalizar meus lançamentos
          </Button>
        )}
      </Group>
      <Text size="sm" c="dimmed" mt="sm">
        {finalizedAt
          ? 'Seus gastos e entradas deste mês estão travados. Esqueceu algo? Dá para reabrir enquanto a família não fechar o acerto.'
          : 'Quando terminar de lançar seus gastos e entradas do mês, finalize. Depois disso eles ficam travados, e o acerto da família só fecha quando todos finalizarem.'}
      </Text>
    </Card>
  );
}

/** "Painel da família": who is still logging the month. */
export function FamilyClosingCard({ month }: { month: string }) {
  const { user } = useAuth();
  const status = useMonthStatus(month);
  const { data: members } = useMembers();
  if (!status.data || !members) return null;

  const missing = members.filter((m) => !status.data.finalized[m.id]);
  const done = members.length - missing.length;

  return (
    <Card mb="lg">
      <Eyebrow>{`Fechamento de ${monthLabel(month)}`}</Eyebrow>
      <Title order={3} mt={4} mb="md">
        {missing.length === 0
          ? 'Todos finalizaram os lançamentos.'
          : `${done} de ${members.length} finalizaram os lançamentos`}
      </Title>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="xs">
        {members.map((m) => {
          const at = status.data.finalized[m.id];
          return (
            <Paper key={m.id} withBorder radius="md" p="xs">
              <Group gap="sm" wrap="nowrap">
                <Avatar user={m} />
                <Text fw={600} size="sm" style={{ flex: 1, minWidth: 0 }} truncate>
                  {m.name}
                  {m.id === user?.id && <Text span c="dimmed" fw={400} size="sm"> (você)</Text>}
                </Text>
                {at ? (
                  <Badge color="petrol" variant="light" tt="none">✓ Finalizou</Badge>
                ) : (
                  <Badge color="gray" variant="light" tt="none">Lançando</Badge>
                )}
              </Group>
            </Paper>
          );
        })}
      </SimpleGrid>
      {missing.length > 0 && (
        <Text size="sm" c="dimmed" mt="sm">
          {missing.length === 1 ? 'Falta' : 'Faltam'} {listNames(missing.map((m) => m.name))}{' '}
          {missing.length === 1 ? 'finalizar' : 'finalizarem'} no Meu painel.
        </Text>
      )}
    </Card>
  );
}

/** Gastos / Entradas: why the actions are disabled, and the way out. */
export function MonthLockedBanner({ month, kind }: { month: string; kind: 'expenses' | 'incomes' }) {
  const what = kind === 'expenses'
    ? 'Seus gastos deste mês não podem ser criados, editados nem excluídos.'
    : 'Suas entradas deste mês não podem ser criadas, editadas nem excluídas.';
  return (
    <Paper
      mb="md" p="sm" radius="md"
      style={{ background: 'var(--mantine-color-mustard-0)', border: '1px solid var(--mantine-color-mustard-2)' }}
    >
      <Text size="sm" c="mustard.9">
        <b>Você finalizou {monthLabel(month)}.</b> {what} Para mudar, reabra seus lançamentos no Meu
        painel.
      </Text>
    </Paper>
  );
}
