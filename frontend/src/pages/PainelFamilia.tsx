import { Card, Grid, Group, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { brl, mesLabel, pct } from '@shared/formato';
import { useConsolidado, useFamilia, useMembros } from '../api/hooks';
import { Donut } from '../components/Donut';
import { Avatar, Cabecalho, Carregando, Categorias, Metrica, Vazio } from '../components/ui';
import { useMes } from '../useMes';

export default function PainelFamilia() {
  const [mes] = useMes();
  const { data: familia } = useFamilia();
  const { data: membros } = useMembros();
  const consolidado = useConsolidado(mes);

  if (!consolidado.data || !membros || !familia) {
    return consolidado.error ? <Vazio>{consolidado.error.message}</Vazio> : <Carregando />;
  }

  const calc = consolidado.data;
  const nomeDe = (id: string) => membros.find((m) => m.id === id)?.nome ?? 'alguém';

  const totalEntradas = membros.reduce((s, u) => s + (calc.porUsuario[u.id]?.entrada ?? 0), 0);
  const maxCota = Math.max(...membros.map((u) => calc.porUsuario[u.id]?.cota ?? 0), 1);
  const sobrou = totalEntradas - calc.totalMes;

  const catFamilia: Record<string, number> = {};
  let fixoFam = 0;
  let opcFam = 0;
  for (const u of membros) {
    const d = calc.porUsuario[u.id];
    if (!d) continue;
    fixoFam += d.fixo;
    opcFam += d.opcional;
    for (const [k, v] of Object.entries(d.categorias)) catFamilia[k] = (catFamilia[k] ?? 0) + v;
  }

  return (
    <>
      <Cabecalho
        titulo={familia.nome}
        descricao={`Consolidado de ${membros.length} ${membros.length === 1 ? 'pessoa' : 'pessoas'} em ${mesLabel(mes)}.`}
      />

      <Card bg="var(--gf-ink)" style={{ borderColor: 'var(--gf-ink)' }} mb="lg">
        <Text size="sm" c="#8FAFA4" mb="sm">Acerto do mês</Text>
        {calc.transferencias.length === 0 ? (
          <p className="acerto" style={{ color: '#fff' }}>Ninguém deve nada a ninguém.</p>
        ) : (
          <Stack gap="xs">
            {calc.transferencias.map((t, i) => (
              <p className="acerto" key={i} style={{ color: '#fff' }}>
                {nomeDe(t.de)} paga <span style={{ color: '#F0C355' }}>{brl(t.valor)}</span> para {nomeDe(t.para)}
              </p>
            ))}
          </Stack>
        )}
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
        <Card><Metrica rotulo="Entrou na casa" valor={brl(totalEntradas)} /></Card>
        <Card><Metrica rotulo="Gasto total" valor={brl(calc.totalMes)} /></Card>
        <Card>
          <Metrica
            rotulo="Sobrou"
            valor={brl(sobrou)}
            cor={sobrou >= 0 ? 'var(--gf-credito)' : 'var(--gf-debito)'}
            detalhe={`${totalEntradas ? pct(sobrou / totalEntradas) : '0%'} do que entrou`}
          />
        </Card>
      </SimpleGrid>

      <Card mb="lg">
        <Title order={3} mb="sm">Quem recebeu e quem gastou</Title>
        <Stack gap={0}>
          {membros.map((u, i) => {
            const d = calc.porUsuario[u.id];
            if (!d) return null;
            const saldo = calc.saldo[u.id] ?? 0;
            return (
              <Group
                key={u.id} wrap="nowrap" py="sm" align="flex-start"
                style={i < membros.length - 1 ? { borderBottom: '1px solid #EEF1EC' } : undefined}
              >
                <Avatar user={u} lg />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={600}>{u.nome}</Text>
                  <Text size="sm" c="dimmed">
                    entrada {brl(d.entrada)} · saiu do bolso {brl(d.pago)}
                  </Text>
                  <Progress value={(d.cota / maxCota) * 100} color={u.cor} size="sm" radius="sm" mt={6} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text className="num" fw={600}>{brl(d.cota)}</Text>
                  <Text className="num" size="sm" c={saldo >= 0 ? 'var(--gf-credito)' : 'var(--gf-debito)'}>
                    {saldo >= 0 ? 'a receber ' : 'a pagar '}{brl(Math.abs(saldo))}
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
            <Donut fixo={fixoFam} opcional={opcFam} />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Onde o dinheiro da casa foi</Title>
            <Categorias mapa={catFamilia} />
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}
