import { Badge, Box, Card, Flex, Grid, Group, Text, Title } from '@mantine/core';
import { monthLabel, pct } from '@shared/format';
import { useStatement, useFamily, useMembers } from '../api/hooks';
import { Donut } from '../components/Donut';
import { FamilyClosingCard } from '../components/MonthClosing';
import { FamilyDebtsCard } from '../components/debts';
import { Avatar, PageHeader, Loading, Categories, Metric, Empty, Money } from '../components/ui';
import { useMonth } from '../useMonth';

/**
 * The label compares the quota — what the house cost each person after the split —
 * with what came in, so it answers "how much of their income did the house take".
 * It reads the same ratio as the bar, so the two never disagree.
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
          const ratio = d.income > 0 ? d.share / d.income : null;
          const tier = incomeTier(ratio);
          const memberLeftOver = d.income - d.share;
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
                    <Text size="sm" c="dimmed">
                      {/* Cada rótulo quebra junto com o seu valor no celular. */}
                      <span style={{ whiteSpace: 'nowrap' }}>gastou: <Money value={d.share} /></span>{' | '}
                      <span style={{ whiteSpace: 'nowrap' }}>recebeu: <Money value={d.income} /></span>
                    </Text>
                  </div>
                </Group>
                {/* Empilhado no mobile, o bloco fica alinhado à esquerda, abaixo do
                    nome — alinhar à direita aqui deixaria os números "soltos"
                    na ponta oposta da tela, quebrando a leitura de cima para baixo. */}
                <Box ta={{ base: 'left', xs: 'right' }} pl={{ base: 52, xs: 0 }}>
                  <Text className="num" fw={600} c={memberLeftOver >= 0 ? 'var(--gf-credit)' : 'var(--gf-debit)'}>
                    <Text span size="sm" c="dimmed" fw={400}>sobrou </Text><Money value={memberLeftOver} />
                  </Text>
                </Box>
              </Flex>
              {/* Quatro quartos da entrada: cada bloco enche por vez com a cota, então
                  a metade e os três quartos se leem sem régua. */}
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
