import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Chip,
  Grid,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import type { ExpenseDTO } from '@shared/contracts';
import { CATEGORIES, PAYMENT_METHODS } from '@shared/domain';
import { brl, monthLabel, pct } from '@shared/format';
import { api } from '../api/client';
import { keys, useStatement, useExpenses, useMembers, useAppMutation, useRules } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Avatar, PageHeader, Loading, CategoryChip, ExpenseTypeChip, Metric, Empty } from '../components/ui';
import { notifyError, notifySuccess, confirmDelete } from '../feedback';
import { useMonth } from '../useMonth';

type Filter = 'all' | 'mine' | 'shared';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Expenses() {
  const [month] = useMonth();
  const { user } = useAuth();
  const { data: members } = useMembers();
  const { data: rules } = useRules();
  const expenses = useExpenses(month);
  const statement = useStatement(month);
  const [filter, setFilter] = useState<Filter>('all');

  const invalidate = [keys.expenses(month), keys.statement(month)];

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      date: new Date(`${month}-15T12:00:00`),
      paymentMethod: 'Crédito',
      category: 'food',
      expenseType: 'fixed',
      description: '',
      amount: '' as string | number,
      shared: false,
      participants: user ? [user.id] : [],
      ruleId: '',
    },
    validate: {
      description: (v) => (v.trim() ? null : 'Descreva o gasto.'),
      amount: (v) => (Number(v) > 0 ? null : 'Informe um valor maior que zero.'),
      participants: (v, vals) =>
        vals.shared && v.length === 0 ? 'Escolha com quem o gasto será dividido.' : null,
      ruleId: (v, vals) => (vals.shared && !v ? 'Escolha a regra de rateio.' : null),
    },
  });

  const create = useAppMutation(
    (body: Record<string, unknown>) => api.post<ExpenseDTO>('/gastos', body),
    invalidate,
    {
      onSuccess: () => {
        form.setFieldValue('description', '');
        form.setFieldValue('amount', '');
        notifySuccess('Gasto lançado.');
      },
      onError: (e) => notifyError(e.message),
    },
  );

  const remove = useAppMutation((id: string) => api.delete(`/gastos/${id}`), invalidate, {
    onSuccess: () => notifySuccess('Gasto removido.'),
    onError: (e) => notifyError(e.message),
  });

  if (!expenses.data || !members || !rules) {
    return expenses.error ? <Empty>{expenses.error.message}</Empty> : <Loading />;
  }

  // The default rule only exists after /regras answers.
  if (!form.getValues().ruleId && rules.length) {
    form.setFieldValue('ruleId', rules[0].id);
  }

  const memberOf = (id: string) => members.find((m) => m.id === id);
  const sharesOf = (id: string) => statement.data?.lines.find((l) => l.id === id)?.shares ?? {};

  const list = expenses.data.filter((e) => {
    if (filter === 'mine') return e.userId === user?.id;
    if (filter === 'shared') return e.shared;
    return true;
  });
  const total = list.reduce((s, e) => s + e.amount, 0);

  const submit = form.onSubmit((v) =>
    create.mutate({
      date: iso(v.date),
      paymentMethod: v.paymentMethod,
      category: v.category,
      expenseType: v.expenseType,
      description: v.description.trim(),
      amount: Number(v.amount),
      shared: v.shared,
      participants: v.shared ? v.participants : [],
      ruleId: v.shared ? v.ruleId : null,
    }),
  );

  const askDelete = (e: ExpenseDTO) =>
    confirmDelete({
      title: 'Excluir gasto',
      description: `"${e.description}" de ${brl(e.amount)}${e.shared ? ', dividido com outras pessoas,' : ''} será apagado e o acerto do mês vai mudar.`,
      onConfirm: () => remove.mutate(e.id),
    });

  const shared = form.getValues().shared;
  const chosenRule = rules.find((r) => r.id === form.getValues().ruleId);

  return (
    <>
      <PageHeader
        title="Gastos"
        description={`Lançamentos da família em ${monthLabel(month)}.`}
        action={<Metric label="Total listado" value={brl(total)} />}
      />

      <Card component="form" onSubmit={submit} mb="lg">
        <Title order={3} mb="md">Lançar gasto</Title>
        <Grid gap="md">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <DatePickerInput label="Data" valueFormat="DD/MM/YYYY" key={form.key('date')} {...form.getInputProps('date')} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Pagamento" allowDeselect={false} data={[...PAYMENT_METHODS]}
              key={form.key('paymentMethod')} {...form.getInputProps('paymentMethod')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Categoria" allowDeselect={false}
              data={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
              key={form.key('category')} {...form.getInputProps('category')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Tipo" allowDeselect={false}
              data={[
                { value: 'fixed', label: 'Gasto fixo' },
                { value: 'optional', label: 'Gasto opcional' },
              ]}
              key={form.key('expenseType')} {...form.getInputProps('expenseType')}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Descrição" placeholder="Aluguel, mercado, cinema…"
              key={form.key('description')} {...form.getInputProps('description')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <NumberInput
              label="Valor" prefix="R$ " decimalScale={2} decimalSeparator="," thousandSeparator="."
              min={0} placeholder="0,00" key={form.key('amount')} {...form.getInputProps('amount')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Checkbox
              label="Dividir com outras pessoas" pb={8}
              key={form.key('shared')} {...form.getInputProps('shared', { type: 'checkbox' })}
            />
          </Grid.Col>

          {shared && (
            <>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Text size="sm" fw={500} c="dimmed" mb={5}>Com quem</Text>
                <Chip.Group
                  multiple
                  key={form.key('participants')}
                  {...form.getInputProps('participants')}
                >
                  <Group gap="xs">
                    {members.map((m) => (
                      <Chip key={m.id} value={m.id} color="petrol" variant="outline">{m.name}</Chip>
                    ))}
                  </Group>
                </Chip.Group>
                {form.errors.participants && (
                  <Text size="sm" c="brick" mt={5}>{form.errors.participants}</Text>
                )}
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select
                  label="Rateio" allowDeselect={false}
                  description={chosenRule?.description}
                  data={rules.map((r) => ({ value: r.id, label: r.name }))}
                  key={form.key('ruleId')} {...form.getInputProps('ruleId')}
                />
              </Grid.Col>
            </>
          )}

          <Grid.Col span={12}>
            <Button type="submit" loading={create.isPending}>Adicionar gasto</Button>
          </Grid.Col>
        </Grid>
      </Card>

      <Card>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Title order={3}>Lançamentos</Title>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            data={[
              { value: 'all', label: 'Todos' },
              { value: 'mine', label: 'Meus' },
              { value: 'shared', label: 'Divididos' },
            ]}
          />
        </Group>

        {list.length === 0 ? (
          <Empty>Nenhum gasto neste filtro.</Empty>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Data</Table.Th>
                  <Table.Th>Quem pagou</Table.Th>
                  <Table.Th>Descrição</Table.Th>
                  <Table.Th>Categoria</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Pagamento</Table.Th>
                  <Table.Th>Divisão</Table.Th>
                  <Table.Th ta="right">Valor</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {list.map((e) => {
                  const owner = memberOf(e.userId);
                  const shares = sharesOf(e.id);
                  return (
                    <Table.Tr key={e.id}>
                      <Table.Td className="num">{e.date.split('-').reverse().join('/')}</Table.Td>
                      <Table.Td>
                        <Group gap={7} wrap="nowrap">
                          {owner && <Avatar user={owner} />}
                          <Text size="md">{owner?.name ?? '—'}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>{e.description}</Table.Td>
                      <Table.Td><CategoryChip id={e.category} /></Table.Td>
                      <Table.Td><ExpenseTypeChip type={e.expenseType} /></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{e.paymentMethod}</Text></Table.Td>
                      <Table.Td>
                        {!e.shared ? (
                          <Text size="sm" c="dimmed">só de quem pagou</Text>
                        ) : (
                          <Stack gap={2}>
                            {e.participants.map((p) => (
                              <Text key={p} size="sm" c="dimmed">
                                {memberOf(p)?.name ?? '—'} · {shares[p] !== undefined ? pct(shares[p]) : '—'}
                              </Text>
                            ))}
                          </Stack>
                        )}
                      </Table.Td>
                      <Table.Td className="num" ta="right" fw={600}>{brl(e.amount)}</Table.Td>
                      <Table.Td>
                        {e.userId === user?.id && (
                          <ActionIcon
                            variant="subtle" color="brick" aria-label={`Excluir ${e.description}`}
                            onClick={() => askDelete(e)}
                          >
                            ✕
                          </ActionIcon>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </>
  );
}
