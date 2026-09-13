import {
  ActionIcon,
  Button,
  Card,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import type { IncomeDTO } from '@shared/contracts';
import type { IncomeType } from '@shared/domain';
import { brl, monthLabel } from '@shared/format';
import { api } from '../api/client';
import { keys, useIncomes, useAppMutation } from '../api/hooks';
import { PageHeader, Loading, Metric, Empty } from '../components/ui';
import { notifyError, notifySuccess, confirmDelete } from '../feedback';
import { useMonth } from '../useMonth';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Income() {
  const [month] = useMonth();
  const incomes = useIncomes();
  const invalidate = [keys.incomes, keys.statement(month)];

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      type: 'recurring' as IncomeType,
      description: '',
      amount: '' as string | number,
      dayOfMonth: 5 as string | number,
      date: new Date(`${month}-15T12:00:00`),
    },
    validate: {
      description: (v) => (v.trim() ? null : 'Descreva a entrada.'),
      amount: (v) => (Number(v) > 0 ? null : 'Informe um valor maior que zero.'),
    },
  });

  const create = useAppMutation(
    (body: Record<string, unknown>) => api.post<IncomeDTO>('/entradas', body),
    invalidate,
    {
      onSuccess: () => {
        form.setFieldValue('description', '');
        form.setFieldValue('amount', '');
        notifySuccess('Entrada lançada.');
      },
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
  const oneOffs = incomes.data.filter(
    (i) => i.type === 'oneOff' && (i.date ?? '').slice(0, 7) === month,
  );
  const total =
    recurring.reduce((s, i) => s + i.amount, 0) + oneOffs.reduce((s, i) => s + i.amount, 0);

  const submit = form.onSubmit((v) =>
    create.mutate({
      type: v.type,
      description: v.description.trim(),
      amount: Number(v.amount),
      ...(v.type === 'recurring' ? { dayOfMonth: Number(v.dayOfMonth) || 1 } : { date: iso(v.date) }),
    }),
  );

  const askDelete = (i: IncomeDTO) =>
    confirmDelete({
      title: 'Remover entrada',
      description: `"${i.description}" de ${brl(i.amount)} será apagada. Isso muda o rateio dos meses que usam renda como base.`,
      onConfirm: () => remove.mutate(i.id),
    });

  const type = form.getValues().type;

  const List = ({ items, detail }: { items: IncomeDTO[]; detail: (i: IncomeDTO) => string }) => (
    <Stack gap={0}>
      {items.map((item, i) => (
        <Group
          key={item.id} wrap="nowrap" py="sm"
          style={i < items.length - 1 ? { borderBottom: '1px solid #EEF1EC' } : undefined}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text>{item.description}</Text>
            <Text size="sm" c="dimmed">{detail(item)}</Text>
          </div>
          <Text className="num" fw={600}>{brl(item.amount)}</Text>
          <ActionIcon
            variant="subtle" color="brick" aria-label={`Remover ${item.description}`}
            onClick={() => askDelete(item)}
          >
            ✕
          </ActionIcon>
        </Group>
      ))}
    </Stack>
  );

  return (
    <>
      <PageHeader
        title="Minhas entradas"
        description="Recorrentes valem todo mês. Pontuais entram só no mês da data."
        action={
          <Card>
            <Metric label={`Total em ${monthLabel(month)}`} value={brl(total)} />
          </Card>
        }
      />

      <Card component="form" onSubmit={submit} mb="lg">
        <Title order={3} mb="md">Lançar entrada</Title>
        <Grid gap="md" align="flex-end">
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            <Select
              label="Tipo" allowDeselect={false}
              data={[
                { value: 'recurring', label: 'Recorrente' },
                { value: 'oneOff', label: 'Pontual' },
              ]}
              key={form.key('type')} {...form.getInputProps('type')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Descrição" placeholder="Salário, freela, aluguel recebido…"
              key={form.key('description')} {...form.getInputProps('description')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            <NumberInput
              label="Valor" prefix="R$ " decimalScale={2} decimalSeparator="," thousandSeparator="."
              min={0} placeholder="0,00" key={form.key('amount')} {...form.getInputProps('amount')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            {type === 'recurring' ? (
              <NumberInput label="Dia do mês" min={1} max={31} key={form.key('dayOfMonth')} {...form.getInputProps('dayOfMonth')} />
            ) : (
              <DatePickerInput label="Data" valueFormat="DD/MM/YYYY" key={form.key('date')} {...form.getInputProps('date')} />
            )}
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Button type="submit" loading={create.isPending} fullWidth>Adicionar</Button>
          </Grid.Col>
        </Grid>
      </Card>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Recorrentes</Title>
            {recurring.length === 0 ? (
              <Empty>Nenhuma entrada recorrente ainda.</Empty>
            ) : (
              <List items={recurring} detail={(i) => `todo dia ${i.dayOfMonth}`} />
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Pontuais de {monthLabel(month)}</Title>
            {oneOffs.length === 0 ? (
              <Empty>Nenhuma entrada pontual neste mês.</Empty>
            ) : (
              <List items={oneOffs} detail={(i) => (i.date ?? '').split('-').reverse().join('/')} />
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}
