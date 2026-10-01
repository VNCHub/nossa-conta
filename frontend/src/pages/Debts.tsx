import { useState } from 'react';
import { Button, Card, Grid, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { DebtDTO } from '@shared/contracts';
import { useDebts, useMembers } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { DebtCard, NewDebtModal, PayDebtModal, isOpen } from '../components/debts';
import { Empty, Loading, Metric, Money, PageHeader } from '../components/ui';

type Filter = 'open' | 'settled' | 'all';

/** Not month-scoped on purpose: a debt lives until it's paid, whatever month is on screen. */
export default function Debts() {
  const { user } = useAuth();
  const debts = useDebts();
  const { data: members } = useMembers();
  const [filter, setFilter] = useState<Filter>('open');
  const [paying, setPaying] = useState<DebtDTO | null>(null);
  const [creating, createModal] = useDisclosure(false);

  if (!debts.data || !members || !user) {
    return debts.error ? <Empty>{debts.error.message}</Empty> : <Loading />;
  }

  const open = debts.data.filter(isOpen);
  const sum = (list: DebtDTO[]) => list.reduce((s, d) => s + d.remaining, 0);
  const shown = debts.data
    .filter((d) => (filter === 'all' ? true : filter === 'open' ? isOpen(d) : !isOpen(d)))
    // Open first; the API already orders by date within each group.
    .sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)));

  return (
    <>
      <PageHeader
        title="Dívidas"
        description="O que uma pessoa da família deve para outra, e quanto já foi pago."
        action={<Button onClick={createModal.open}>Lançar dívida</Button>}
      />

      <Grid gap={{ base: 'xs', sm: 'md' }} mb="lg">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Card h="100%">
            <Metric
              label="Em aberto na família"
              value={<Money value={sum(open)} />}
              detail={`${open.length} ${open.length === 1 ? 'dívida' : 'dívidas'}`}
            />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4 }}>
          <Card h="100%">
            <Metric label="Você tem a receber" color="var(--gf-credit)"
              value={<Money value={sum(open.filter((d) => d.toUserId === user.id))} />} />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4 }}>
          <Card h="100%">
            <Metric label="Você tem a pagar" color="var(--gf-debit)"
              value={<Money value={sum(open.filter((d) => d.fromUserId === user.id))} />} />
          </Card>
        </Grid.Col>
      </Grid>

      <Card>
        <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
          <Title order={3}>Todas as dívidas da família</Title>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            data={[
              { value: 'open', label: 'Em aberto' },
              { value: 'settled', label: 'Quitadas' },
              { value: 'all', label: 'Todas' },
            ]}
          />
        </Group>
        {shown.length === 0 ? (
          <Empty>
            {filter === 'open' ? 'Nenhuma dívida em aberto.' : filter === 'settled' ? 'Nenhuma dívida quitada ainda.' : 'Nenhuma dívida lançada.'}
          </Empty>
        ) : (
          <Stack gap="sm">
            {shown.map((d) => (
              <DebtCard key={d.id} debt={d} members={members} userId={user.id} onPay={setPaying} />
            ))}
          </Stack>
        )}
        <Text size="xs" c="dimmed" mt="md">
          Pagamentos de dívida aparecem em Gastos e Entradas, mas ficam fora do rateio e dos totais da família.
        </Text>
      </Card>

      <NewDebtModal opened={creating} onClose={createModal.close} members={members} userId={user.id} />
      <PayDebtModal debt={paying} onClose={() => setPaying(null)} members={members} />
    </>
  );
}
