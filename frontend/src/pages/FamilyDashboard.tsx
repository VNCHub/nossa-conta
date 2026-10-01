import { Badge, Box, Card, Flex, Grid, Group, Text, Title } from '@mantine/core';
import { monthLabel, pct } from '@shared/format';
import { useStatement, useFamily, useMembers } from '../api/hooks';
import { Donut } from '../components/Donut';
import { FamilyClosingCard } from '../components/MonthClosing';
import { FamilyDebtsCard } from '../components/debts';
import { Avatar, PageHeader, Loading, Categories, Metric, Empty, Money } from '../components/ui';
import { useMonth } from '../useMonth';

/**
 * The label compares what left each person's pocket with what came in — not the
 * quota — so it answers "how much of their income did the house take", which is
 * the part the family cannot see from the settlement.
 */
const incomeTier = (ratio: number | null) => {
  if (ratio === null) return { label: 'sem entrada no mês', color: 'gray' };
  if (ratio < 0.5) return { label: 'sobra bastante', color: 'petrol' };
  if (ratio < 0.75) return { label: 'folga confortável', color: 'petrol' };
  if (ratio <= 1) return { label: 'apertando o cinto', color: 'mustard' };
  return { label: 'gastou mais do que entrou', color: 'brick' };
};

export default function FamilyDashboard() {
  const [month] = useMonth();
  const { data: family } = useFamily();
  const { data: members } = useMembers();
  const statement = useStatement(month);

  if (!statement.data || !members || !family) {
    return statement.error ? <Empty>{statement.error.message}</Empty> : <Loading />;
  }

  const calc = statement.data;

  const totalIncome = members.reduce((s, u) => s + (calc.byUser[u.id]?.income ?? 0), 0);
  const leftOver = totalIncome - calc.monthTotal;

  const familyCategories: Record<string, number> = {};
  let familyFixed = 0;
  let familyOptional = 0;
  let familyOneOff = 0;
  for (const u of members) {
    const d = calc.byUser[u.id];
    if (!d) continue;
    familyFixed += d.fixed;
    familyOptional += d.optional;
    familyOneOff += d.oneOff;
    for (const [k, v] of Object.entries(d.categories)) familyCategories[k] = (familyCategories[k] ?? 0) + v;
  }

  return (
    <>
      <PageHeader
        title={family.name}
        description={`Consolidado de ${members.length} ${members.length === 1 ? 'pessoa' : 'pessoas'} em ${monthLabel(month)}.`}
      />

      <FamilyClosingCard month={month} />
      <FamilyDebtsCard />

      {/* Duas colunas no mobile: Entrou/Gasto lado a lado e Sobrou em largura
          total, em vez de três cards empilhados ocupando uma tela inteira. */}
      <Grid gap={{ base: 'xs', sm: 'md' }} mb="lg">
        <Grid.Col span={{ base: 6, sm: 4 }}><Card h="100%"><Metric label="Entrou na casa" value={<Money value={totalIncome} />} /></Card></Grid.Col>
        <Grid.Col span={{ base: 6, sm: 4 }}><Card h="100%"><Metric label="Gasto total" value={<Money value={calc.monthTotal} />} /></Card></Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
        <Card h="100%">
          <Metric
            label="Sobrou"
            value={<Money value={leftOver} />}
            color={leftOver >= 0 ? 'var(--gf-credit)' : 'var(--gf-debit)'}
            detail={`${totalIncome ? pct(leftOver / totalIncome) : '0%'} do que entrou`}
          />
        </Card>
        </Grid.Col>
      </Grid>

      <Card mb="lg">
        <Title order={3}>Quem recebeu e quem gastou</Title>
        <Text size="sm" c="dimmed" mb="xs">Quanto da entrada cada um deixou na casa este mês.</Text>
        {members.map((u, i) => {
          const d = calc.byUser[u.id];
          if (!d) return null;
          const balance = calc.balance[u.id] ?? 0;
          const ratio = d.income > 0 ? d.paid / d.income : null;
          const tier = incomeTier(ratio);
          return (
            <Box key={u.id} py="sm" style={i > 0 ? { borderTop: '1px solid #EEF1EC' } : undefined}>
              <Flex direction={{ base: 'column', xs: 'row' }} gap={{ base: 4, xs: 'md' }} wrap="nowrap">
                <Group wrap="nowrap" gap="sm" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
                  <Avatar user={u} lg />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs">
                      <Text fw={600}>{u.name}</Text>
                      <Badge color={tier.color} variant="light" tt="none">{tier.label}</Badge>
                    </Group>
                    <Text size="sm" c="dimmed">saiu do bolso <Money value={d.paid} /> de <Money value={d.income} /> que entrou</Text>
                  </div>
                </Group>
                {/* Empilhado no mobile, o bloco fica alinhado à esquerda, abaixo do
                    nome — alinhar à direita aqui deixaria os números "soltos"
                    na ponta oposta da tela, quebrando a leitura de cima para baixo. */}
                <Box ta={{ base: 'left', xs: 'right' }} pl={{ base: 52, xs: 0 }}>
                  <Text className="num" fw={600}>
                    <Text span size="sm" c="dimmed" fw={400}>cota </Text><Money value={d.share} />
                  </Text>
                  <Text className="num" size="sm" c={balance >= 0 ? 'var(--gf-credit)' : 'var(--gf-debit)'}>
                    {balance >= 0 ? 'a receber ' : 'a pagar '}<Money value={Math.abs(balance)} />
                  </Text>
                </Box>
              </Flex>
              {/* Quatro quartos da entrada: cada bloco enche por vez, então a metade e
                  os três quartos (onde mudam as etiquetas) se leem sem régua. */}
              <Flex gap={4} mt="sm">
                {[0, 1, 2, 3].map((q) => (
                  <Box key={q} h={22} bg="#EEF1EC" style={{ flex: 1, borderRadius: 6, overflow: 'hidden' }}>
                    <Box h="100%" bg={u.color} w={`${Math.min(Math.max((ratio ?? 0) * 4 - q, 0), 1) * 100}%`} />
                  </Box>
                ))}
              </Flex>
              <Group justify="space-between" c="dimmed" fz="xs" mt={4}>
                <span>R$ 0</span>
                <Money value={d.income} />
              </Group>
            </Box>
          );
        })}
      </Card>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="lg">Tipo de gasto na casa</Title>
            <Donut fixed={familyFixed} optional={familyOptional} oneOff={familyOneOff} />
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
