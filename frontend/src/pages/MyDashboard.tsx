import { Card, Grid, SimpleGrid, Text, Title } from '@mantine/core';
import { brl, monthLabel, pct } from '@shared/format';
import { useAuth } from '../auth/AuthContext';
import { useStatement } from '../api/hooks';
import { Donut } from '../components/Donut';
import { PageHeader, Loading, Categories, Metric, Empty } from '../components/ui';
import { useMonth } from '../useMonth';

export default function MyDashboard() {
  const [month] = useMonth();
  const { user } = useAuth();
  const statement = useStatement(month);

  if (!statement.data || !user) {
    return statement.error ? <Empty>{statement.error.message}</Empty> : <Loading />;
  }

  const calc = statement.data;
  const d = calc.byUser[user.id];
  if (!d) return <Empty>Sem dados seus neste mês.</Empty>;

  const leftOver = d.income - d.share;
  const myBalance = calc.balance[user.id] ?? 0;
  const optionalShare = d.fixed + d.optional > 0 ? d.optional / (d.fixed + d.optional) : 0;

  return (
    <>
      <PageHeader
        title="Meu painel"
        description="Sua cota real: gastos individuais mais a sua parte do que foi dividido."
      />

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
        <Card><Metric label="Entrou" value={brl(d.income)} /></Card>
        <Card>
          <Metric label="Sua cota de gastos" value={brl(d.share)} detail={`saiu do seu bolso: ${brl(d.paid)}`} />
        </Card>
        <Card>
          <Metric
            label="Sobrou"
            value={brl(leftOver)}
            color={leftOver >= 0 ? 'var(--gf-credit)' : 'var(--gf-debit)'}
            detail={`${d.income ? pct(leftOver / d.income) : '0%'} da sua entrada`}
          />
        </Card>
      </SimpleGrid>

      <Grid gap="lg" mb="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="lg">Fixo contra opcional</Title>
            <Donut fixed={d.fixed} optional={d.optional} />
            <Text size="sm" c="dimmed" mt="lg">
              {optionalShare > 0.35
                ? 'Mais de um terço da sua cota é gasto opcional — é aí que dá pra mexer sem mudar de vida.'
                : 'Sua base fixa domina o mês. Cortar aqui exige renegociar contrato, não só hábito.'}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Onde o dinheiro foi</Title>
            <Categories amounts={d.categories} />
          </Card>
        </Grid.Col>
      </Grid>

      <Card>
        <Title order={3} mb="xs">Seu acerto em {monthLabel(month)}</Title>
        {Math.abs(myBalance) < 0.01 ? (
          <Text c="dimmed" size="md">Você está quite com todo mundo neste mês.</Text>
        ) : (
          <p className="settlement">
            Você tem{' '}
            <span style={{ color: myBalance > 0 ? 'var(--gf-credit)' : 'var(--gf-debit)' }}>
              {brl(Math.abs(myBalance))}
            </span>{' '}
            {myBalance > 0 ? 'a receber.' : 'a pagar.'}
          </p>
        )}
        <Text size="sm" c="dimmed" mt="sm">
          Diferença entre o que saiu do seu bolso ({brl(d.paid)}) e a sua cota ({brl(d.share)}).
        </Text>
      </Card>
    </>
  );
}
