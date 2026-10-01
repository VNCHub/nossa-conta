import { Badge, Button, Card, Group, Paper, SimpleGrid, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { Link } from 'react-router-dom';
import { brl, monthLabel } from '@shared/format';
import {
  useCloseMonth,
  useFinalizeMonth,
  useMembers,
  useMonthStatus,
  useReopenMonthClosing,
  useReopenMyMonth,
  useStatement,
} from '../api/hooks';
import { confirmDelete, notifyError, notifySuccess } from '../feedback';
import { useAuth } from '../auth/AuthContext';
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
  const closed = !!status.data.closed;

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
      style={finalizedAt ? undefined : { borderColor: 'var(--gf-credit)', boxShadow: '0 0 0 3px var(--gf-ok-soft)' }}
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
          <Button variant="default" onClick={doReopen} loading={reopen.isPending} disabled={closed}>
            Reabrir meus lançamentos
          </Button>
        ) : (
          <Button onClick={askFinalize} loading={finalize.isPending}>
            Finalizar meus lançamentos
          </Button>
        )}
      </Group>
      {closed ? (
        <Paper mt="sm" p="xs" radius="md" style={{ background: 'var(--gf-warn-bg)', border: '1px solid var(--gf-warn-line)' }}>
          <Text size="sm" c="var(--gf-warn-on)">
            O acerto da família já foi fechado. Para reabrir seus lançamentos, alguém precisa antes reabrir o mês no Painel da família.
          </Text>
        </Paper>
      ) : (
      <Text size="sm" c="dimmed" mt="sm">
        {finalizedAt
          ? 'Seus gastos e entradas deste mês estão travados. Esqueceu algo? Dá para reabrir enquanto a família não fechar o acerto.'
          : 'Quando terminar de lançar seus gastos e entradas do mês, finalize. Depois disso eles ficam travados, e o acerto da família só fecha quando todos finalizarem.'}
      </Text>
      )}
    </Card>
  );
}

/** "Painel da família": who is still logging the month, and closing the settlement into debts. */
export function FamilyClosingCard({ month }: { month: string }) {
  const { user } = useAuth();
  const status = useMonthStatus(month);
  const statement = useStatement(month);
  const { data: members } = useMembers();
  const close = useCloseMonth(month);
  const reopen = useReopenMonthClosing(month);
  if (!status.data || !members) return null;

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? 'Ex-membro';
  const closed = status.data.closed;

  if (closed) {
    const alive = closed.debtIds.length;
    const gone = closed.generatedCount - alive;
    const askReopen = () =>
      confirmDelete({
        title: 'Reabrir mês',
        confirmLabel: 'Reabrir mês',
        description: [
          alive
            ? `${alive === 1 ? 'A dívida gerada' : `As ${alive} dívidas geradas`} pelo fechamento de ${monthLabel(month)} ${alive === 1 ? 'será apagada' : 'serão apagadas'}.`
            : 'As dívidas geradas por este fechamento já foram excluídas; nada mais é apagado.',
          'Pagamentos já lançados continuam como gastos e entradas.',
          'Depois, cada pessoa poderá reabrir os próprios lançamentos.',
        ].join(' '),
        onConfirm: () =>
          reopen.mutate(undefined, {
            onSuccess: () => notifySuccess('Mês reaberto'),
            onError: (e) => notifyError(e.message),
          }),
      });

    return (
      <Card mb="lg" bg="var(--gf-ok-soft)" style={{ borderColor: 'var(--gf-ok-bg)' }}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <div>
            <Eyebrow>{`Fechamento de ${monthLabel(month)}`}</Eyebrow>
            <Title order={3} mt={4}>
              Acerto fechado em {finalizedOn(closed.closedAt)} por {nameOf(closed.closedById)}
            </Title>
          </div>
          <Button variant="default" c="var(--gf-danger)" onClick={askReopen} loading={reopen.isPending}>
            Reabrir mês
          </Button>
        </Group>
        <Text size="sm" c="dimmed" mt="sm">
          {closed.generatedCount === 0
            ? 'Ninguém devia nada a ninguém: nenhuma dívida foi gerada.'
            : `Gerou ${closed.generatedCount} ${closed.generatedCount === 1 ? 'dívida' : 'dívidas'}${gone ? `, ${gone} já ${gone === 1 ? 'foi excluída' : 'foram excluídas'}` : ''}.`}{' '}
          <Text span component={Link} to="/dividas" size="sm" td="underline" c="dimmed">Ver em Dívidas</Text>
        </Text>
      </Card>
    );
  }

  const missing = members.filter((m) => !status.data.finalized[m.id]);
  const done = members.length - missing.length;
  const ready = missing.length === 0;
  const transfers = statement.data?.transfers ?? [];

  const askClose = () =>
    modals.openConfirmModal({
      title: 'Fechar acerto do mês',
      children: (
        <Text size="sm">
          {transfers.length === 0
            ? `Ninguém deve nada a ninguém em ${monthLabel(month)}: o mês fecha sem gerar dívidas.`
            : `O acerto de ${monthLabel(month)} vira ${transfers.length === 1 ? 'uma dívida' : `${transfers.length} dívidas`}: ${transfers
                .map((t) => `${nameOf(t.from)} paga ${brl(t.amount)} para ${nameOf(t.to)}`)
                .join('; ')}.`}{' '}
          Depois de fechado, ninguém reabre os próprios lançamentos deste mês até alguém reabrir o mês.
        </Text>
      ),
      labels: { confirm: 'Fechar acerto', cancel: 'Cancelar' },
      onConfirm: () =>
        close.mutate(undefined, {
          onSuccess: (s) =>
            notifySuccess(
              s.closed?.generatedCount
                ? `Acerto fechado. ${s.closed.generatedCount} ${s.closed.generatedCount === 1 ? 'dívida criada' : 'dívidas criadas'}.`
                : 'Acerto fechado.',
            ),
          onError: (e) => notifyError(e.message),
        }),
    });

  return (
    <Card
      mb="lg"
      style={ready ? { borderColor: 'var(--gf-credit)', boxShadow: '0 0 0 3px var(--gf-ok-soft)' } : undefined}
    >
      <Eyebrow>{`Fechamento de ${monthLabel(month)}`}</Eyebrow>
      <Title order={3} mt={4} mb="md">
        {ready
          ? 'Todos finalizaram. O acerto pode ser fechado.'
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
      <Group justify="space-between" align="center" wrap="wrap" gap="sm" mt="sm">
        <Text size="sm" c="dimmed">
          {ready
            ? 'Fechar transforma cada transferência do acerto em uma dívida.'
            : `${missing.length === 1 ? 'Falta' : 'Faltam'} ${listNames(missing.map((m) => m.name))} ${missing.length === 1 ? 'finalizar' : 'finalizarem'} no Meu painel.`}
        </Text>
        <Button onClick={askClose} disabled={!ready || !statement.data} loading={close.isPending}>
          Fechar acerto do mês
        </Button>
      </Group>
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
      style={{ background: 'var(--gf-warn-bg)', border: '1px solid var(--gf-warn-line)' }}
    >
      <Text size="sm" c="var(--gf-warn-on)">
        <b>Você finalizou {monthLabel(month)}.</b> {what} Para mudar, reabra seus lançamentos no Meu
        painel.
      </Text>
    </Paper>
  );
}
