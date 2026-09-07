import { Card, Grid, Group, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { brl, monthLabel, pct } from '@shared/format';
import { useStatement, useFamily, useMembers } from '../api/hooks';
import { Donut } from '../components/Donut';
import { Avatar, PageHeader, Loading, Categories, Metric, Empty } from '../components/ui';
import { useMonth } from '../useMonth';

export default function FamilyDashboard() {
  const [month] = useMonth();
  const { data: family } = useFamily();
  const { data: members } = useMembers();
  const statement = useStatement(month);

  if (!statement.data || !members || !family) {
    return statement.error ? <Empty>{statement.error.message}</Empty> : <Loading />;
  }

  const calc = statement.data;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? 'alguém';

  const totalIncome = members.reduce((s, u) => s + (calc.byUser[u.id]?.income ?? 0), 0);
  const maxShare = Math.max(...members.map((u) => calc.byUser[u.id]?.share ?? 0), 1);
  const leftOver = totalIncome - calc.monthTotal;

  const familyCategories: Record<string, number> = {};
  let familyFixed = 0;
  let familyOptional = 0;
  for (const u of members) {
    const d = calc.byUser[u.id];
    if (!d) continue;
    familyFixed += d.fixed;
    familyOptional += d.optional;
    for (const [k, v] of Object.entries(d.categories)) familyCategories[k] = (familyCategories[k] ?? 0) + v;
  }

  return (
    <>
      <PageHeader
        title={family.name}
        description={`Consolidado de ${members.length} ${members.length === 1 ? 'pessoa' : 'pessoas'} em ${monthLabel(month)}.`}
      />

      <Card bg="var(--gf-ink)" style={{ borderColor: 'var(--gf-ink)' }} mb="lg">
        <Text size="sm" c="#8FAFA4" mb="sm">Acerto do mês</Text>
        {calc.transfers.length === 0 ? (
          <p className="settlement" style={{ color: '#fff' }}>Ninguém deve nada a ninguém.</p>
        ) : (
          <Stack gap="xs">
            {calc.transfers.map((t, i) => (
              <p className="settlement" key={i} style={{ color: '#fff' }}>
                {nameOf(t.from)} paga <span style={{ color: '#F0C355' }}>{brl(t.amount)}</span> para {nameOf(t.to)}
              </p>
            ))}
          </Stack>
        )}
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
        <Card><Metric label="Entrou na casa" value={brl(totalIncome)} /></Card>
        <Card><Metric label="Gasto total" value={brl(calc.monthTotal)} /></Card>
        <Card>
          <Metric
            label="Sobrou"
            value={brl(leftOver)}
            color={leftOver >= 0 ? 'var(--gf-credit)' : 'var(--gf-debit)'}
            detail={`${totalIncome ? pct(leftOver / totalIncome) : '0%'} do que entrou`}
          />
        </Card>
      </SimpleGrid>

      <Card mb="lg">
        <Title order={3} mb="sm">Quem recebeu e quem gastou</Title>
        <Stack gap={0}>
          {members.map((u, i) => {
            const d = calc.byUser[u.id];
            if (!d) return null;
            const balance = calc.balance[u.id] ?? 0;
            return (
              <Group
                key={u.id} wrap="nowrap" py="sm" align="flex-start"
                style={i < members.length - 1 ? { borderBottom: '1px solid #EEF1EC' } : undefined}
              >
                <Avatar user={u} lg />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={600}>{u.name}</Text>
                  <Text size="sm" c="dimmed">
                    entrada {brl(d.income)} · saiu do bolso {brl(d.paid)}
                  </Text>
                  <Progress value={(d.share / maxShare) * 100} color={u.color} size="sm" radius="sm" mt={6} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text className="num" fw={600}>{brl(d.share)}</Text>
                  <Text className="num" size="sm" c={balance >= 0 ? 'var(--gf-credit)' : 'var(--gf-debit)'}>
                    {balance >= 0 ? 'a receber ' : 'a pagar '}{brl(Math.abs(balance))}
                  </Text>
                </div>
              </Group>
            );
          })}
        </Stack>
      </Card>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="lg">Fixo contra opcional na casa</Title>
            <Donut fixed={familyFixed} optional={familyOptional} />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Onde o dinheiro da casa foi</Title>
            <Categories amounts={familyCategories} />
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}
