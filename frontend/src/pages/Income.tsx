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
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput, MonthPickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import type { IncomeDTO } from '@shared/contracts';
import type { IncomeType } from '@shared/domain';
import { brl, monthLabel, monthLabelCompact, recurringAppliesToMonth, shiftMonth } from '@shared/format';
import { api } from '../api/client';
import { keys, useIncomes, useAppMutation } from '../api/hooks';
import { PageHeader, Loading, Metric, Empty, TrashIcon } from '../components/ui';
import { notifyError, notifySuccess, confirmDelete, confirmChoice } from '../feedback';
import { useMonth } from '../useMonth';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthIso = (d: Date) => iso(d).slice(0, 7);

export default function Income() {
  const [month] = useMonth();
  const incomes = useIncomes();
  const invalidate = [keys.incomes, keys.statement(month)];
  const [createOpen, createModal] = useDisclosure(false);

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

  const recurring = incomes.data.filter((i) => i.type === 'recurring');
  const activeRecurring = recurring.filter((i) => recurringAppliesToMonth(i.since, i.until, month));
  const oneOffs = incomes.data.filter(
    (i) => i.type === 'oneOff' && (i.date ?? '').slice(0, 7) === month,
  );
  const total =
    activeRecurring.reduce((s, i) => s + i.amount, 0) + oneOffs.reduce((s, i) => s + i.amount, 0);

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

  return (
    <>
      <PageHeader
        title="Minhas entradas"
        description="Recorrentes valem todo mês, dentro do período declarado. Pontuais entram só no mês da data."
        action={
          <Group wrap="nowrap">
            <Card>
              <Metric label={`Total em ${monthLabel(month)}`} value={brl(total)} />
            </Card>
            <Button onClick={createModal.open}>Lançar entrada</Button>
          </Group>
        }
      />

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Recorrentes em {monthLabel(month)}</Title>
            {activeRecurring.length === 0 ? (
              <Empty>Nenhuma entrada recorrente neste mês.</Empty>
            ) : (
              <Stack gap={0}>
                {activeRecurring.map((item, i) => (
                  <RecurringRow
                    key={item.id}
                    item={item}
                    isLast={i === activeRecurring.length - 1}
                    onDelete={() => askRemoveRecurring(item)}
                  />
                ))}
              </Stack>
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Pontuais de {monthLabel(month)}</Title>
            {oneOffs.length === 0 ? (
              <Empty>Nenhuma entrada pontual neste mês.</Empty>
            ) : (
              <Stack gap={0}>
                {oneOffs.map((item, i) => (
                  <OneOffRow
                    key={item.id}
                    item={item}
                    isLast={i === oneOffs.length - 1}
                    onRemove={() => askRemoveOneOff(item)}
                  />
                ))}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      <Modal opened={createOpen} onClose={createModal.close} title="Lançar entrada" size="lg" centered>
        <IncomeForm month={month} onSubmit={(body) => create.mutate(body)} loading={create.isPending} onClose={createModal.close} />
      </Modal>
    </>
  );
}

/** One row of "Recorrentes" — badges instead of a squashed text line. */
function RecurringRow({
  item,
  isLast,
  onDelete,
}: {
  item: IncomeDTO;
  isLast: boolean;
  onDelete: () => void;
}) {
  return (
    <Group
      wrap="nowrap" py="sm" align="flex-start"
      style={!isLast ? { borderBottom: '1px solid #EEF1EC' } : undefined}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text>{item.description}</Text>
        <Group gap={6} mt={6}>
          <Badge variant="light" size="sm" tt="none">todo dia {item.dayOfMonth}</Badge>
          {item.since && (
            <Badge variant="light" size="sm" tt="none">
              desde {monthLabelCompact(item.since)}
            </Badge>
          )}
          {item.until && (
            <Badge variant="light" size="sm" tt="none">
              até {monthLabelCompact(item.until)}
            </Badge>
          )}
        </Group>
      </div>
      <Text className="num" fw={600}>{brl(item.amount)}</Text>
      <ActionIcon
        variant="subtle" color="brick" aria-label={`Remover ${item.description}`}
        onClick={onDelete}
      >
        <TrashIcon />
      </ActionIcon>
    </Group>
  );
}

function OneOffRow({ item, isLast, onRemove }: { item: IncomeDTO; isLast: boolean; onRemove: () => void }) {
  return (
    <Group
      wrap="nowrap" py="sm"
      style={!isLast ? { borderBottom: '1px solid #EEF1EC' } : undefined}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text>{item.description}</Text>
        <Text size="sm" c="dimmed">{(item.date ?? '').split('-').reverse().join('/')}</Text>
      </div>
      <Text className="num" fw={600}>{brl(item.amount)}</Text>
      <ActionIcon
        variant="subtle" color="brick" aria-label={`Remover ${item.description}`}
        onClick={onRemove}
      >
        <TrashIcon />
      </ActionIcon>
    </Group>
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
      since: new Date(`${month}-15T12:00:00`),
      repeats: false,
      date: new Date(`${month}-15T12:00:00`),
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
            key={form.key('type')} {...form.getInputProps('type')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <NumberInput
            label="Valor" prefix="R$ " decimalScale={2} decimalSeparator="," thousandSeparator="."
            min={0} placeholder="0,00" key={form.key('amount')} {...form.getInputProps('amount')}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <TextInput
            label="Descrição" placeholder="Salário, freela, aluguel recebido…"
            key={form.key('description')} {...form.getInputProps('description')}
          />
        </Grid.Col>

        {type === 'recurring' ? (
          <>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput label="Dia do mês" min={1} max={31} key={form.key('dayOfMonth')} {...form.getInputProps('dayOfMonth')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <MonthPickerInput
                label="Vale a partir de" valueFormat="MM/YYYY"
                key={form.key('since')} {...form.getInputProps('since')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Checkbox
                mt={28}
                label="Repetir nos meses seguintes"
                key={form.key('repeats')} {...form.getInputProps('repeats', { type: 'checkbox' })}
              />
            </Grid.Col>
          </>
        ) : (
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <DatePickerInput label="Data" valueFormat="DD/MM/YYYY" key={form.key('date')} {...form.getInputProps('date')} />
          </Grid.Col>
        )}
      </Grid>

      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={loading}>Adicionar</Button>
      </Group>
    </form>
  );
}
