import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Grid,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { DatePickerInput, MonthPickerInput } from '@mantine/dates';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import type { IncomeDTO } from '@shared/contracts';
import type { IncomeType } from '@shared/domain';
import { brl, monthLabel, monthLabelShort, shiftMonth } from '@shared/format';
import { api } from '../api/client';
import { keys, useIncomes, useAppMutation } from '../api/hooks';
import { PageHeader, Loading, Metric, Empty, Money, TrashIcon, IncomeTypeChip } from '../components/ui';
import { incomesOfMonth, repeatsAfter, type Repeats } from './incomeRows';
import { notifyError, notifySuccess, confirmDelete, confirmChoice } from '../feedback';
import { useMonth } from '../useMonth';
import { MonthLockedBanner, useMyMonthLocked } from '../components/MonthClosing';

// Mantine 9 date pickers hand back a Date on initial mount but a
// `YYYY-MM-DD` string once the user actually picks a day — accept both.
const iso = (d: Date | string) =>
  typeof d === 'string'
    ? d.slice(0, 10)
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthIso = (d: Date | string) => iso(d).slice(0, 7);

export default function Income() {
  const [month] = useMonth();
  // Any write here (new entry, removing one, ending a recurrence from this month) touches this month.
  const locked = useMyMonthLocked(month);
  const incomes = useIncomes();
  const invalidate = [keys.incomes, keys.statement(month)];
  const [createOpen, createModal] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 48em)');

  const create = useAppMutation(
    (body: Record<string, unknown>) => api.post<IncomeDTO>('/entradas', body),
    invalidate,
    {
      onSuccess: () => {
        notifySuccess('Entrada lançada.');
        createModal.close();
      },
      onError: (e) => notifyError(e.message),
    },
  );

  // Ends the recurrence right before the viewed month — keeps every month
  // before it exactly as it was. When there is no month before it either
  // (this is its very first one), that leaves nothing to keep, so it just
  // removes the entry outright instead of saving an empty, invalid range.
  const end = useAppMutation(
    (vars: { id: string; until: string }) => api.patch<IncomeDTO>(`/entradas/${vars.id}`, { until: vars.until }),
    invalidate,
    {
      onSuccess: () => notifySuccess('Entrada encerrada — os meses anteriores continuam como estavam.'),
      onError: (e) => notifyError(e.message),
    },
  );

  const remove = useAppMutation((id: string) => api.delete(`/entradas/${id}`), invalidate, {
    onSuccess: () => notifySuccess('Entrada removida.'),
    onError: (e) => notifyError(e.message),
  });

  if (!incomes.data) {
    return incomes.error ? <Empty>{incomes.error.message}</Empty> : <Loading />;
  }

  const rows = incomesOfMonth(incomes.data, month);
  const total = rows.reduce((s, r) => s + r.item.amount, 0);

  const doRemove = (i: IncomeDTO) => remove.mutate(i.id);
  const doEndOrRemove = (i: IncomeDTO) => {
    const until = shiftMonth(month, -1);
    if (i.since && until < i.since) doRemove(i);
    else end.mutate({ id: i.id, until });
  };

  /** Two irreversible, genuinely different actions — always both, never a single default. */
  const askRemoveRecurring = (i: IncomeDTO) =>
    confirmChoice({
      title: 'Remover entrada recorrente',
      description: `"${i.description}" de ${brl(i.amount)} — o que você quer fazer?`,
      delaySeconds: 3,
      choices: [
        { label: 'Remover todo histórico', onSelect: () => doRemove(i) },
        { label: `Remover de ${monthLabel(month)} em diante`, onSelect: () => doEndOrRemove(i) },
      ],
    });

  const askRemoveOneOff = (i: IncomeDTO) =>
    confirmDelete({
      title: 'Remover entrada',
      description: `"${i.description}" de ${brl(i.amount)} será apagada. Isso muda o rateio do mês.`,
      onConfirm: () => doRemove(i),
    });

  const askRemove = (i: IncomeDTO) => (i.type === 'recurring' ? askRemoveRecurring(i) : askRemoveOneOff(i));
  // A debt receipt only goes away with the payer's payment.
  const canRemove = (i: IncomeDTO) => !locked && !i.debtPaymentId;

  return (
    <>
      <PageHeader
        title="Minhas entradas"
        description="Recorrentes valem todo mês, dentro do período declarado. Pontuais entram só no mês da data."
        action={
          <Group wrap="wrap" gap="sm" style={{ flex: '1 1 auto' }}>
            <Card style={{ flex: '1 1 200px' }}>
              <Metric label={`Total em ${monthLabel(month)}`} value={<Money value={total} />} />
            </Card>
            <Button onClick={createModal.open} disabled={locked} size="md" w={{ base: '100%', sm: 'auto' }} style={{ flexShrink: 0 }}>Lançar entrada</Button>
          </Group>
        }
      />

      {locked && <MonthLockedBanner month={month} kind="incomes" />}

      <Card>
        {rows.length === 0 ? (
          <Empty>Nenhuma entrada em {monthLabel(month)}.</Empty>
        ) : (
          <>
            <IncomeTable rows={rows} month={month} canRemove={canRemove} onRemove={askRemove} />
            <Stack hiddenFrom="sm" gap="sm">
              {rows.map(({ item, date }) => (
                <MobileIncomeCard
                  key={item.id}
                  item={item}
                  date={date}
                  month={month}
                  canRemove={canRemove(item)}
                  onRemove={() => askRemove(item)}
                />
              ))}
            </Stack>
          </>
        )}
      </Card>

      <Modal opened={createOpen} onClose={createModal.close} title="Lançar entrada" size="lg" centered fullScreen={isMobile}>
        <IncomeForm month={month} onSubmit={(body) => create.mutate(body)} loading={create.isPending} onClose={createModal.close} />
      </Modal>
    </>
  );
}

const ROW_BG = 'var(--mantine-color-petrol-0)';
const REPEATS_COLOR: Record<Repeats['kind'], string> = {
  yes: 'petrol.7',
  until: 'mustard.8',
  no: 'dimmed',
  na: 'dimmed',
};

const brDate = (iso: string) => iso.split('-').reverse().join('/');

// Mobile cards have no column header, so a bare "Sim"/"Não" would not say what it answers.
const SPELLED_OUT: Partial<Record<Repeats['kind'], string>> = { yes: 'Repete todo mês', no: 'Não repete' };

function RepeatsText({ item, month, spelledOut }: { item: IncomeDTO; month: string; spelledOut?: boolean }) {
  const r = repeatsAfter(item, month);
  return (
    <Text size="sm" fw={r.kind === 'na' ? 400 : 600} c={REPEATS_COLOR[r.kind]} style={{ whiteSpace: 'nowrap' }}>
      {(spelledOut && SPELLED_OUT[r.kind]) || r.label}
    </Text>
  );
}

function Description({ item }: { item: IncomeDTO }) {
  return (
    <div style={{ minWidth: 0 }}>
      <Group gap={6} wrap="wrap">
        <Text style={{ overflowWrap: 'anywhere' }}>{item.description}</Text>
        {item.debtPaymentId && (
          <Badge color="indigo" variant="light" size="sm" tt="none">Recebimento de dívida</Badge>
        )}
      </Group>
      {item.type === 'recurring' && item.since && (
        <Text size="sm" c="dimmed">desde {monthLabelShort(item.since)}</Text>
      )}
    </div>
  );
}

function RemoveButton({ item, enabled, onRemove, size }: {
  item: IncomeDTO;
  enabled: boolean;
  onRemove: () => void;
  size: 'md' | number;
}) {
  return (
    <ActionIcon
      variant="subtle" color="brick" size={size} aria-label={`Remover ${item.description}`}
      onClick={onRemove}
      disabled={!enabled}
    >
      <TrashIcon />
    </ActionIcon>
  );
}

/** Desktop: one table for both kinds, laid out like the expenses ledger. */
function IncomeTable({
  rows,
  month,
  canRemove,
  onRemove,
}: {
  rows: { item: IncomeDTO; date: string }[];
  month: string;
  canRemove: (i: IncomeDTO) => boolean;
  onRemove: (i: IncomeDTO) => void;
}) {
  return (
    <Table.ScrollContainer minWidth={720} visibleFrom="sm">
      <Table verticalSpacing="sm" withRowBorders={false} styles={{ td: { height: 60, verticalAlign: 'middle' } }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th><Text fz={16} fw={600}>Data</Text></Table.Th>
            <Table.Th><Text fz={16} fw={600}>Descrição</Text></Table.Th>
            <Table.Th><Text fz={16} fw={600}>Tipo</Text></Table.Th>
            <Table.Th><Text fz={16} fw={600}>Recorrência</Text></Table.Th>
            <Table.Th ta="right"><Text fz={16} fw={600}>Valor</Text></Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map(({ item, date }, i) => {
            const isFirst = i === 0;
            const isLast = i === rows.length - 1;
            // Rounding only takes on the table's four outer corners, like the expenses ledger.
            const firstCell = {
              backgroundColor: ROW_BG,
              ...(isFirst ? { borderTopLeftRadius: 8 } : {}),
              ...(isLast ? { borderBottomLeftRadius: 8 } : {}),
            };
            const lastCell = {
              backgroundColor: ROW_BG,
              ...(isFirst ? { borderTopRightRadius: 8 } : {}),
              ...(isLast ? { borderBottomRightRadius: 8 } : {}),
            };
            const midCell = { backgroundColor: ROW_BG };
            return (
              <Table.Tr key={item.id}>
                <Table.Td className="num" style={firstCell}>{brDate(date)}</Table.Td>
                <Table.Td style={midCell}><Description item={item} /></Table.Td>
                <Table.Td style={midCell}><IncomeTypeChip type={item.type} /></Table.Td>
                <Table.Td style={midCell}><RepeatsText item={item} month={month} /></Table.Td>
                <Table.Td className="num" ta="right" fw={600} style={{ ...midCell, whiteSpace: 'nowrap' }}>
                  <Money value={item.amount} />
                </Table.Td>
                <Table.Td style={lastCell} w={56}>
                  <RemoveButton item={item} enabled={canRemove(item)} onRemove={() => onRemove(item)} size="md" />
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function MobileIncomeCard({
  item,
  date,
  month,
  canRemove,
  onRemove,
}: {
  item: IncomeDTO;
  date: string;
  month: string;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <Card p="sm" radius="md" style={{ backgroundColor: ROW_BG }}>
      <Group justify="space-between" align="center" wrap="nowrap" mb={4}>
        <Text size="sm" c="dimmed" className="num">{brDate(date)}</Text>
        <RemoveButton item={item} enabled={canRemove} onRemove={onRemove} size={44} />
      </Group>
      <Description item={item} />
      <Group justify="space-between" align="center" wrap="nowrap" mt={8}>
        <Group gap={8} wrap="wrap">
          <IncomeTypeChip type={item.type} />
          {item.type === 'recurring' && <RepeatsText item={item} month={month} spelledOut />}
        </Group>
        <Text className="num" fw={600} style={{ whiteSpace: 'nowrap' }}><Money value={item.amount} /></Text>
      </Group>
    </Card>
  );
}

/**
 * "Repetir nos meses seguintes" starts off: the common case for a freshly
 * declared recurring entry is describing what already happened this month,
 * not silently committing to every month from now on.
 */
function IncomeForm({
  month,
  onSubmit,
  loading,
  onClose,
}: {
  month: string;
  onSubmit: (body: Record<string, unknown>) => void;
  loading: boolean;
  onClose: () => void;
}) {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      type: 'recurring' as IncomeType,
      description: '',
      amount: '' as string | number,
      dayOfMonth: 5 as string | number,
      since: new Date(`${month}-15T12:00:00`) as Date | string,
      repeats: false,
      date: new Date(`${month}-15T12:00:00`) as Date | string,
    },
    validate: {
      description: (v) => (v.trim() ? null : 'Descreva a entrada.'),
      amount: (v) => (Number(v) > 0 ? null : 'Informe um valor maior que zero.'),
    },
  });

  const submit = form.onSubmit((v) => {
    const since = monthIso(v.since);
    onSubmit({
      type: v.type,
      description: v.description.trim(),
      amount: Number(v.amount),
      ...(v.type === 'recurring'
        ? { dayOfMonth: Number(v.dayOfMonth) || 1, since, ...(v.repeats ? {} : { until: since }) }
        : { date: iso(v.date) }),
    });
  });

  const type = form.getValues().type;

  // iOS Safari zooms the whole page in on focus when an input's font is under
  // 16px — jarring on a touchscreen form. 16px here keeps zoom-on-focus off.
  // minHeight 44px keeps every field a comfortable touch target.
  const noZoomStyles = { input: { fontSize: '16px', minHeight: 44 } };
  const pickerType = useMediaQuery('(max-width: 48em)') ? 'modal' : 'popover';

  return (
    <form onSubmit={submit}>
      <Grid gap="md" align="flex-end">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Select
            label="Tipo" allowDeselect={false}
            data={[
              { value: 'recurring', label: 'Recorrente' },
              { value: 'oneOff', label: 'Pontual' },
            ]}
            styles={noZoomStyles}
            key={form.key('type')} {...form.getInputProps('type')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <NumberInput
            label="Valor" prefix="R$ " decimalScale={2} decimalSeparator="," thousandSeparator="."
            min={0} placeholder="0,00" inputMode="decimal" styles={noZoomStyles}
            key={form.key('amount')} {...form.getInputProps('amount')}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <TextInput
            label="Descrição" placeholder="Salário, freela, aluguel recebido…"
            styles={noZoomStyles}
            key={form.key('description')} {...form.getInputProps('description')}
          />
        </Grid.Col>

        {type === 'recurring' ? (
          <>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Dia do mês" min={1} max={31} inputMode="numeric" styles={noZoomStyles}
                key={form.key('dayOfMonth')} {...form.getInputProps('dayOfMonth')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <MonthPickerInput
                label="Vale a partir de" valueFormat="MM/YYYY" dropdownType={pickerType} styles={noZoomStyles}
                key={form.key('since')} {...form.getInputProps('since')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              {/* mt aligns the checkbox with the labels beside it in the 3-up
                  desktop row; on mobile the fields stack, so that offset would
                  just leave a dead gap above it. */}
              <Checkbox
                mt={{ base: 4, sm: 28 }}
                size="md" label="Repetir nos meses seguintes"
                key={form.key('repeats')} {...form.getInputProps('repeats', { type: 'checkbox' })}
              />
            </Grid.Col>
          </>
        ) : (
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <DatePickerInput
              label="Data" valueFormat="DD/MM/YYYY" dropdownType={pickerType} styles={noZoomStyles}
              key={form.key('date')} {...form.getInputProps('date')}
            />
          </Grid.Col>
        )}
      </Grid>

      <Group justify="flex-end" mt="lg" grow preventGrowOverflow={false}>
        <Button variant="default" size="md" onClick={onClose}>Cancelar</Button>
        <Button type="submit" size="md" loading={loading}>Adicionar</Button>
      </Group>
    </form>
  );
}
