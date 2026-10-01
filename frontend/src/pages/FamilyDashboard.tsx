import type { CSSProperties } from 'react';
import { Box, Card, Flex, Grid, Group, Progress, Stack, Text, Title } from '@mantine/core';
import { monthLabel, pct } from '@shared/format';
import { useStatement, useFamily, useMembers } from '../api/hooks';
import { Donut } from '../components/Donut';
import { FamilyClosingCard } from '../components/MonthClosing';
import { Avatar, PageHeader, Loading, Categories, Metric, Empty, Money } from '../components/ui';
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

      <Card
        bg="var(--gf-ink)"
        mb="lg"
        // Dark surface: hidden values need a bar lighter than the card, not darker.
        style={{ borderColor: 'var(--gf-ink)', '--gf-surface': 'var(--gf-ink)', '--gf-on': '#fff', '--gf-mask-mix': '26%' } as CSSProperties}
      >
        <Text size="sm" c="#8FAFA4" mb="sm">Acerto do mês</Text>
        {calc.transfers.length === 0 ? (
          <p className="settlement" style={{ color: '#fff' }}>Ninguém deve nada a ninguém.</p>
        ) : (
          // No mobile a fonte editorial (30px/23px) quebra linha com mais
          // frequência; um gap maior evita que duas transferências pareçam um
          // parágrafo só.
          <Flex direction="column" gap={{ base: 'sm', xs: 'xs' }}>
            {calc.transfers.map((t, i) => (
              <p className="settlement" key={i} style={{ color: '#fff' }}>
                {nameOf(t.from)} paga <span style={{ color: '#F0C355' }}><Money value={t.amount} /></span> para {nameOf(t.to)}
              </p>
            ))}
          </Flex>
        )}
      </Card>

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
        <Title order={3} mb="sm">Quem recebeu e quem gastou</Title>
        <Stack gap={0}>
          {members.map((u, i) => {
            const d = calc.byUser[u.id];
            if (!d) return null;
            const balance = calc.balance[u.id] ?? 0;
            return (
              <Flex
                key={u.id}
                direction={{ base: 'column', xs: 'row' }}
                gap={{ base: 4, xs: 'md' }}
                wrap="nowrap"
                py="sm"
                style={i < members.length - 1 ? { borderBottom: '1px solid #EEF1EC' } : undefined}
              >
                <Group wrap="nowrap" gap="sm" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
                  <Avatar user={u} lg />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600}>{u.name}</Text>
                    {/* Uma linha por dado no mobile: o "·" quebrava no meio de um valor. */}
                    <Flex direction={{ base: 'column', xs: 'row' }} columnGap="xs" c="dimmed" fz="sm">
                      <span>entrada <Money value={d.income} /></span>
                      <span>
                        <Box component="span" visibleFrom="xs">· </Box>saiu do bolso <Money value={d.paid} />
                      </span>
                    </Flex>
                    <Progress value={(d.share / maxShare) * 100} color={u.color} size="sm" radius="sm" mt={6} />
                  </div>
                </Group>
                {/* Empilhado no mobile, o bloco fica alinhado à esquerda, abaixo do
                    nome — alinhar à direita aqui deixaria os números "soltos"
                    na ponta oposta da tela, quebrando a leitura de cima para baixo. */}
                <Box ta={{ base: 'left', xs: 'right' }} pl={{ base: 52, xs: 0 }}>
                  <Text className="num" fw={600}>
                    <Text span size="sm" c="dimmed" fw={400} hiddenFrom="xs">cota </Text><Money value={d.share} />
                  </Text>
                  <Text className="num" size="sm" c={balance >= 0 ? 'var(--gf-credit)' : 'var(--gf-debit)'}>
                    {balance >= 0 ? 'a receber ' : 'a pagar '}<Money value={Math.abs(balance)} />
                  </Text>
                </Box>
              </Flex>
            );
          })}
        </Stack>
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
