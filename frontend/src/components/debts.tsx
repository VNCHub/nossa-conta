import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useMediaQuery } from '@mantine/hooks';
import { Link } from 'react-router-dom';
import type { DebtDTO, MemberDTO } from '@shared/contracts';
import { PAYMENT_METHODS } from '@shared/domain';
import { brl, monthLabel, monthLabelCompact } from '@shared/format';
import { useCreateDebt, useDebts, useDeleteDebt, useMembers, useMonthStatus, usePayDebt } from '../api/hooks';
import { confirmDelete, notifyError, notifySuccess } from '../feedback';
import { iso } from '../pages/expenses/date';
import { Avatar, Money } from './ui';

// iOS Safari zooms in on focus under 16px; 44px keeps fields easy to tap.
const noZoomStyles = { input: { fontSize: '16px', minHeight: 44 } };

const dateLabel = (d: string) => d.split('-').reverse().join('/');
const today = () => iso(new Date());
/** Exact half in cents, so "Metade" never offers a third decimal place. */
const half = (reais: number) => Math.round((reais * 100) / 2) / 100;

export const isOpen = (d: DebtDTO) => d.remaining > 0;

export function DebtFlow({ debt, members }: { debt: DebtDTO; members: MemberDTO[] }) {
  const from = members.find((m) => m.id === debt.fromUserId);
  const to = members.find((m) => m.id === debt.toUserId);
  return (
    <Group gap={6} wrap="wrap">
      {from && <Avatar user={from} />}
      <Text fw={600}>{from?.name ?? 'Ex-membro'}</Text>
      <Text c="dimmed" size="sm">paga para</Text>
      {to && <Avatar user={to} />}
      <Text fw={600}>{to?.name ?? 'Ex-membro'}</Text>
    </Group>
  );
}

export function OriginBadge({ debt }: { debt: DebtDTO }) {
  return debt.origin === 'monthClosing' && debt.closingMonth ? (
    <Badge color="mustard" variant="light" tt="none">Fechamento de {monthLabelCompact(debt.closingMonth)}</Badge>
  ) : (
    <Badge color="gray" variant="light" tt="none">Lançada à mão</Badge>
  );
}

const paidPct = (d: DebtDTO) => (d.amount > 0 ? (d.paid / d.amount) * 100 : 0);

/** One debt on the Dívidas screen: balance, payments and the actions the viewer may take. */
export function DebtCard({
  debt,
  members,
  userId,
  onPay,
}: {
  debt: DebtDTO;
  members: MemberDTO[];
  userId: string;
  onPay: (d: DebtDTO) => void;
}) {
  const [showPayments, setShowPayments] = useState(false);
  const remove = useDeleteDebt();
  const involved = debt.fromUserId === userId || debt.toUserId === userId;
  const settled = !isOpen(debt);
  const debtor = members.find((m) => m.id === debt.fromUserId);

  const askDelete = () =>
    confirmDelete({
      title: 'Excluir dívida',
      confirmLabel: 'Excluir dívida',
      description: [
        `"${debt.description}" de ${brl(debt.amount)} deixa de existir para a família, inclusive o saldo de ${brl(debt.remaining)} que ainda falta.`,
        debt.payments.length
          ? `Os pagamentos já feitos (${brl(debt.paid)}) continuam lançados, como gasto de quem pagou e entrada de quem recebeu.`
          : '',
        debt.origin === 'monthClosing' && debt.closingMonth
          ? `Ela veio do fechamento de ${monthLabel(debt.closingMonth)}: o mês continua fechado e ainda pode ser reaberto normalmente.`
          : '',
      ].filter(Boolean).join(' '),
      onConfirm: () =>
        remove.mutate(debt.id, {
          onSuccess: () => notifySuccess('Dívida excluída'),
          onError: (e) => notifyError(e.message),
        }),
    });

  return (
    <Paper withBorder radius="lg" p="md" bg={settled ? '#FAFBF9' : undefined}>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <DebtFlow debt={debt} members={members} />
          <Group gap="xs" mt={6} wrap="wrap">
            <Text size="sm" c="dimmed">{debt.description} · {dateLabel(debt.date)}</Text>
            <OriginBadge debt={debt} />
            {settled && <Badge color="petrol" variant="light" tt="none">Quitada</Badge>}
          </Group>
        </div>
        <div style={{ textAlign: 'right' }}>
          {settled ? (
            <>
              <Text className="num" fz="lg" fw={600} c="var(--gf-credit)"><Money value={debt.amount} /></Text>
              <Text size="sm" c="dimmed">pago</Text>
            </>
          ) : (
            <>
              <Text className="num" fz="lg" fw={600}><Money value={debt.remaining} /></Text>
              <Text size="sm" c="dimmed">falta, de <Money value={debt.amount} /></Text>
            </>
          )}
        </div>
      </Group>

      <Progress value={paidPct(debt)} color="petrol" size="sm" radius="sm" my="sm" />

      <Group justify="space-between" wrap="wrap" gap="xs">
        {debt.payments.length ? (
          <UnstyledButton onClick={() => setShowPayments((v) => !v)}>
            <Text size="sm" td="underline" c="dimmed">
              {showPayments ? 'Ocultar' : 'Ver'} pagamentos ({debt.payments.length})
            </Text>
          </UnstyledButton>
        ) : (
          <Text size="sm" c="dimmed">Nenhum pagamento ainda</Text>
        )}
        <Group gap="xs">
          {involved && (
            <Button size="xs" variant="default" color="brick" c="brick.7" onClick={askDelete} loading={remove.isPending}>
              Excluir
            </Button>
          )}
          {!settled && debt.fromUserId === userId && (
            <Button size="xs" onClick={() => onPay(debt)}>Pagar</Button>
          )}
          {!settled && debt.toUserId === userId && (
            <Text size="sm" c="dimmed">Aguardando pagamento de {debtor?.name ?? 'quem deve'}</Text>
          )}
        </Group>
      </Group>

      {showPayments && debt.payments.length > 0 && (
        <Stack gap={6} mt="sm" pt="sm" style={{ borderTop: '1px dashed var(--gf-line)' }}>
          {debt.payments.map((p) => (
            <Group key={p.expenseId} justify="space-between" wrap="nowrap" gap="sm">
              <Text size="sm" className="num">{dateLabel(p.date)}</Text>
              <Text size="sm" c="dimmed" style={{ flex: 1, minWidth: 0 }} truncate>
                gasto em {monthLabel(p.date.slice(0, 7))}
              </Text>
              <Text size="sm" fw={600} className="num"><Money value={p.amount} /></Text>
              <Button component={Link} to={`/gastos?mes=${p.date.slice(0, 7)}`} size="xs" variant="subtle">
                Ver em Gastos
              </Button>
            </Group>
          ))}
          <Text size="xs" c="dimmed">Para desfazer um pagamento, exclua o gasto correspondente em Gastos.</Text>
        </Stack>
      )}
    </Paper>
  );
}

/** Compact line for the dashboards. */
export function DebtLine({
  debt,
  members,
  perspective,
  onPay,
}: {
  debt: DebtDTO;
  members: MemberDTO[];
  /** family: shows both people; receive / pay: shows only the other person */
  perspective: 'family' | 'receive' | 'pay';
  onPay?: (d: DebtDTO) => void;
}) {
  const other = members.find((m) => m.id === (perspective === 'receive' ? debt.fromUserId : debt.toUserId));
  return (
    <Group justify="space-between" wrap="nowrap" gap="sm" py="xs" style={{ borderBottom: '1px solid #EEF1EC' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        {perspective === 'family' ? (
          <DebtFlow debt={debt} members={members} />
        ) : (
          <Group gap={6} wrap="nowrap">
            {other && <Avatar user={other} />}
            <Text fw={600} truncate>{other?.name ?? 'Ex-membro'}</Text>
          </Group>
        )}
        <Group gap="xs" mt={4} wrap="wrap">
          <Text size="sm" c="dimmed">{debt.description}</Text>
          {perspective === 'family' && <OriginBadge debt={debt} />}
        </Group>
        <Progress value={paidPct(debt)} color="petrol" size="xs" radius="sm" mt={6} maw={200} />
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <Text
          className="num" fw={600}
          c={perspective === 'receive' ? 'var(--gf-credit)' : perspective === 'pay' ? 'var(--gf-debit)' : undefined}
        >
          <Money value={debt.remaining} />
        </Text>
        <Text size="xs" c="dimmed">de <Money value={debt.amount} /></Text>
        {perspective === 'pay' && onPay && (
          <Button size="xs" mt={4} onClick={() => onPay(debt)}>Pagar</Button>
        )}
      </div>
    </Group>
  );
}

export function NewDebtModal({
  opened,
  onClose,
  members,
  userId,
}: {
  opened: boolean;
  onClose: () => void;
  members: MemberDTO[];
  userId: string;
}) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const create = useCreateDebt();
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      toUserId: userId,
      fromUserId: members.find((m) => m.id !== userId)?.id ?? '',
      amount: '' as string | number,
      description: '',
      date: new Date() as Date | string,
    },
    validate: {
      fromUserId: (v, all) => (!v ? 'Escolha quem paga.' : v === all.toUserId ? 'Quem paga e quem recebe precisam ser pessoas diferentes.' : null),
      toUserId: (v) => (v ? null : 'Escolha quem recebe.'),
      amount: (v) => (Number(v) > 0 ? null : 'Informe um valor maior que zero.'),
      description: (v) => (v.trim() ? null : 'Escreva uma descrição para lembrar do que é a dívida.'),
    },
  });
  const options = members.map((m) => ({ value: m.id, label: m.name }));

  const submit = form.onSubmit((v) =>
    create.mutate(
      {
        fromUserId: v.fromUserId,
        toUserId: v.toUserId,
        amount: Number(v.amount),
        description: v.description.trim(),
        date: iso(v.date),
      },
      {
        onSuccess: () => {
          notifySuccess('Dívida lançada');
          form.reset();
          onClose();
        },
        onError: (e) => notifyError(e.message),
      },
    ),
  );

  return (
    <Modal opened={opened} onClose={onClose} title="Lançar dívida" centered fullScreen={isMobile}>
      <form onSubmit={submit}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <Select label="Quem recebe" data={options} allowDeselect={false} styles={noZoomStyles}
              key={form.key('toUserId')} {...form.getInputProps('toUserId')} />
            <Select label="Quem paga" data={options} allowDeselect={false} styles={noZoomStyles}
              key={form.key('fromUserId')} {...form.getInputProps('fromUserId')} />
          </SimpleGrid>
          <NumberInput
            label="Valor" prefix="R$ " decimalScale={2} decimalSeparator="," thousandSeparator="."
            min={0} placeholder="0,00" inputMode="decimal" styles={noZoomStyles}
            key={form.key('amount')} {...form.getInputProps('amount')}
          />
          <TextInput label="Descrição" placeholder="Ex.: empréstimo, parte da viagem" styles={noZoomStyles}
            key={form.key('description')} {...form.getInputProps('description')} />
          <DatePickerInput label="Data" valueFormat="DD/MM/YYYY" dropdownType={isMobile ? 'modal' : 'popover'}
            styles={noZoomStyles} key={form.key('date')} {...form.getInputProps('date')} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={create.isPending}>Lançar dívida</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

/**
 * Paying is lançar a gasto: pre-filled from the debt, of the "Dívida" type,
 * landing in the month of the date chosen here — plus the receiver's income.
 */
export function PayDebtModal({
  debt,
  onClose,
  members,
}: {
  debt: DebtDTO | null;
  onClose: () => void;
  members: MemberDTO[];
}) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  return (
    <Modal opened={!!debt} onClose={onClose} title="Pagar dívida" centered fullScreen={isMobile}>
      {/* Keyed by debt so the form starts fresh, pre-filled for each one. */}
      {debt && <PayDebtForm key={debt.id} debt={debt} members={members} onClose={onClose} />}
    </Modal>
  );
}

function PayDebtForm({ debt, members, onClose }: { debt: DebtDTO; members: MemberDTO[]; onClose: () => void }) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const pay = usePayDebt();
  const receiver = members.find((m) => m.id === debt.toUserId);
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      amount: debt.remaining as string | number,
      date: today() as Date | string,
      description: `Pagamento para ${receiver?.name ?? 'quem recebe'} · ${debt.description}`,
      paymentMethod: 'Pix' as string | null,
    },
    validate: {
      amount: (v) =>
        !(Number(v) > 0)
          ? 'Informe um valor maior que zero.'
          : Number(v) > debt.remaining
            ? `O pagamento não pode passar do que falta (${brl(debt.remaining)}).`
            : null,
    },
  });

  const submit = form.onSubmit((v) => {
    const date = iso(v.date);
    pay.mutate(
      {
        id: debt.id,
        amount: Number(v.amount),
        date,
        description: v.description.trim() || undefined,
        paymentMethod: v.paymentMethod ?? undefined,
      },
      {
        onSuccess: (d) => {
          notifySuccess(
            d.remaining === 0
              ? `Pagamento lançado em ${monthLabel(date.slice(0, 7))}. Dívida quitada.`
              : `Pagamento lançado em ${monthLabel(date.slice(0, 7))}. Falta ${brl(d.remaining)}.`,
          );
          onClose();
        },
        onError: (e) => notifyError(e.message),
      },
    );
  });

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Card withBorder p="sm" bg="#F6F8F5">
          <DebtFlow debt={debt} members={members} />
          <Text size="sm" c="dimmed" mt={6}>
            {debt.description} · falta <b className="num"><Money value={debt.remaining} /></b> de <Money value={debt.amount} />
          </Text>
        </Card>
        <Text size="sm" c="dimmed">
          O pagamento lança, no mês da data abaixo, um gasto seu do tipo <b>Dívida</b> e uma entrada pontual
          para {receiver?.name ?? 'quem recebe'}. Nenhum dos dois entra no rateio nem nos totais da família.
        </Text>
        <div>
          <NumberInput
            label="Valor pago" prefix="R$ " decimalScale={2} decimalSeparator="," thousandSeparator="."
            min={0} inputMode="decimal" styles={noZoomStyles}
            key={form.key('amount')} {...form.getInputProps('amount')}
          />
          <Group gap="xs" mt={6}>
            <Button size="xs" variant="default" onClick={() => form.setFieldValue('amount', debt.remaining)}>
              Tudo ({brl(debt.remaining)})
            </Button>
            <Button size="xs" variant="default" onClick={() => form.setFieldValue('amount', half(debt.remaining))}>
              Metade
            </Button>
          </Group>
        </div>
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <DatePickerInput label="Data" valueFormat="DD/MM/YYYY" dropdownType={isMobile ? 'modal' : 'popover'}
            styles={noZoomStyles} key={form.key('date')} {...form.getInputProps('date')} />
          <Select label="Pagamento" data={[...PAYMENT_METHODS]} styles={noZoomStyles}
            key={form.key('paymentMethod')} {...form.getInputProps('paymentMethod')} />
        </SimpleGrid>
        <TextInput label="Descrição do gasto" styles={noZoomStyles}
          key={form.key('description')} {...form.getInputProps('description')} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pay.isPending}>Lançar gasto e pagar</Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Painel da família: every open debt, both people shown. */
export function FamilyDebtsCard() {
  const debts = useDebts();
  const { data: members } = useMembers();
  if (!debts.data || !members) return null;
  const open = debts.data.filter(isOpen);
  return (
    <Card mb="lg">
      <Group justify="space-between" mb="xs">
        <Title order={3}>Dívidas em aberto na família</Title>
        <Text component={Link} to="/dividas" size="sm" td="underline" c="dimmed">Ver todas</Text>
      </Group>
      {open.length === 0 ? (
        <Text size="sm" c="dimmed">Nenhuma dívida em aberto.</Text>
      ) : (
        open.map((d) => <DebtLine key={d.id} debt={d} members={members} perspective="family" />)
      )}
    </Card>
  );
}

/** Meu painel: what the member is owed and owes, with "Pagar" on their side. */
export function MyDebtsCard({ userId }: { userId: string }) {
  const debts = useDebts();
  const { data: members } = useMembers();
  const [paying, setPaying] = useState<DebtDTO | null>(null);
  if (!debts.data || !members) return null;

  const open = debts.data.filter(isOpen);
  const receive = open.filter((d) => d.toUserId === userId);
  const pay = open.filter((d) => d.fromUserId === userId);
  const sum = (list: DebtDTO[]) => list.reduce((s, d) => s + d.remaining, 0);

  const column = (title: string, list: DebtDTO[], perspective: 'receive' | 'pay', empty: string) => (
    <div>
      <Group justify="space-between" mb={4}>
        <Text size="sm" c="dimmed">{title}</Text>
        <Text className="num" fw={600} c={perspective === 'receive' ? 'var(--gf-credit)' : 'var(--gf-debit)'}>
          <Money value={sum(list)} />
        </Text>
      </Group>
      {list.length === 0 ? (
        <Text size="sm" c="dimmed">{empty}</Text>
      ) : (
        list.map((d) => <DebtLine key={d.id} debt={d} members={members} perspective={perspective} onPay={setPaying} />)
      )}
    </div>
  );

  return (
    <Card mb="lg">
      <Group justify="space-between" mb="sm">
        <Title order={3}>Suas dívidas</Title>
        <Text component={Link} to="/dividas" size="sm" td="underline" c="dimmed">Ver todas</Text>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {column('A receber', receive, 'receive', 'Ninguém te deve.')}
        {column('A pagar', pay, 'pay', 'Você não deve nada.')}
      </SimpleGrid>
      <PayDebtModal debt={paying} onClose={() => setPaying(null)} members={members} />
    </Card>
  );
}

/**
 * Once a month is closed its settlement lives on as debts, so "what's left of
 * the acerto" is their remaining balances. Only the debts *this month's*
 * closing generated count — never hand-entered debts or another month's
 * closing, or one month's acerto would show another's balance. Payments count
 * whenever they were made. Null while loading or while the month is still open
 * (the statement's transfers are the acerto then).
 */
export function useClosedSettlement(month: string): { debts: DebtDTO[] } | null {
  const status = useMonthStatus(month);
  const debts = useDebts();
  const closed = status.data?.closed;
  if (!closed || !debts.data) return null;
  return { debts: debts.data.filter((d) => closed.debtIds.includes(d.id)) };
}

export const allPaid = (debts: DebtDTO[]) => debts.length > 0 && debts.every((d) => !isOpen(d));
