import { Card, Grid, SimpleGrid, Text, Title } from '@mantine/core';
import { brl, mesLabel, pct } from '@shared/formato';
import { useAuth } from '../auth/AuthContext';
import { useConsolidado } from '../api/hooks';
import { Donut } from '../components/Donut';
import { Cabecalho, Carregando, Categorias, Metrica, Vazio } from '../components/ui';
import { useMes } from '../useMes';

export default function MeuPainel() {
  const [mes] = useMes();
  const { usuario } = useAuth();
  const consolidado = useConsolidado(mes);

  if (!consolidado.data || !usuario) {
    return consolidado.error ? <Vazio>{consolidado.error.message}</Vazio> : <Carregando />;
  }

  const calc = consolidado.data;
  const d = calc.porUsuario[usuario.id];
  if (!d) return <Vazio>Sem dados seus neste mês.</Vazio>;

  const sobrou = d.entrada - d.cota;
  const meuSaldo = calc.saldo[usuario.id] ?? 0;
  const parcelaOpcional = d.fixo + d.opcional > 0 ? d.opcional / (d.fixo + d.opcional) : 0;

  return (
    <>
      <Cabecalho
        titulo="Meu painel"
        descricao="Sua cota real: gastos individuais mais a sua parte do que foi dividido."
      />

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
        <Card><Metrica rotulo="Entrou" valor={brl(d.entrada)} /></Card>
        <Card>
          <Metrica rotulo="Sua cota de gastos" valor={brl(d.cota)} detalhe={`saiu do seu bolso: ${brl(d.pago)}`} />
        </Card>
        <Card>
          <Metrica
            rotulo="Sobrou"
            valor={brl(sobrou)}
            cor={sobrou >= 0 ? 'var(--gf-credito)' : 'var(--gf-debito)'}
            detalhe={`${d.entrada ? pct(sobrou / d.entrada) : '0%'} da sua entrada`}
          />
        </Card>
      </SimpleGrid>

      <Grid gap="lg" mb="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="lg">Fixo contra opcional</Title>
            <Donut fixo={d.fixo} opcional={d.opcional} />
            <Text size="sm" c="dimmed" mt="lg">
              {parcelaOpcional > 0.35
                ? 'Mais de um terço da sua cota é gasto opcional — é aí que dá pra mexer sem mudar de vida.'
                : 'Sua base fixa domina o mês. Cortar aqui exige renegociar contrato, não só hábito.'}
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Onde o dinheiro foi</Title>
            <Categorias mapa={d.categorias} />
          </Card>
        </Grid.Col>
      </Grid>

      <Card>
        <Title order={3} mb="xs">Seu acerto em {mesLabel(mes)}</Title>
        {Math.abs(meuSaldo) < 0.01 ? (
          <Text c="dimmed" size="md">Você está quite com todo mundo neste mês.</Text>
        ) : (
          <p className="acerto">
            Você tem{' '}
            <span style={{ color: meuSaldo > 0 ? 'var(--gf-credito)' : 'var(--gf-debito)' }}>
              {brl(Math.abs(meuSaldo))}
            </span>{' '}
            {meuSaldo > 0 ? 'a receber.' : 'a pagar.'}
          </p>
        )}
        <Text size="sm" c="dimmed" mt="sm">
          Diferença entre o que saiu do seu bolso ({brl(d.pago)}) e a sua cota ({brl(d.cota)}).
        </Text>
      </Card>
    </>
  );
}
