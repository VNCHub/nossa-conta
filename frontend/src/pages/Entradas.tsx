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
import type { EntradaDTO } from '@shared/contratos';
import type { TipoEntrada } from '@shared/dominio';
import { brl, mesLabel } from '@shared/formato';
import { api } from '../api/client';
import { chaves, useEntradas, useMutacao } from '../api/hooks';
import { Cabecalho, Carregando, Metrica, Vazio } from '../components/ui';
import { avisarErro, avisarSucesso, confirmarExclusao } from '../feedback';
import { useMes } from '../useMes';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Entradas() {
  const [mes] = useMes();
  const entradas = useEntradas();
  const invalidar = [chaves.entradas, chaves.consolidado(mes)];

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      tipo: 'recorrente' as TipoEntrada,
      descricao: '',
      valor: '' as string | number,
      diaDoMes: 5 as string | number,
      data: new Date(`${mes}-15T12:00:00`),
    },
    validate: {
      descricao: (v) => (v.trim() ? null : 'Descreva a entrada.'),
      valor: (v) => (Number(v) > 0 ? null : 'Informe um valor maior que zero.'),
    },
  });

  const criar = useMutacao(
    (corpo: Record<string, unknown>) => api.post<EntradaDTO>('/entradas', corpo),
    invalidar,
    {
      onSuccess: () => {
        form.setFieldValue('descricao', '');
        form.setFieldValue('valor', '');
        avisarSucesso('Entrada lançada.');
      },
      onError: (e) => avisarErro(e.message),
    },
  );

  const remover = useMutacao((id: string) => api.delete(`/entradas/${id}`), invalidar, {
    onSuccess: () => avisarSucesso('Entrada removida.'),
    onError: (e) => avisarErro(e.message),
  });

  if (!entradas.data) {
    return entradas.error ? <Vazio>{entradas.error.message}</Vazio> : <Carregando />;
  }

  const recorrentes = entradas.data.filter((e) => e.tipo === 'recorrente');
  const pontuais = entradas.data.filter(
    (e) => e.tipo === 'pontual' && (e.data ?? '').slice(0, 7) === mes,
  );
  const total =
    recorrentes.reduce((s, e) => s + e.valor, 0) + pontuais.reduce((s, e) => s + e.valor, 0);

  const enviar = form.onSubmit((v) =>
    criar.mutate({
      tipo: v.tipo,
      descricao: v.descricao.trim(),
      valor: Number(v.valor),
      ...(v.tipo === 'recorrente' ? { diaDoMes: Number(v.diaDoMes) || 1 } : { data: iso(v.data) }),
    }),
  );

  const pedirExclusao = (e: EntradaDTO) =>
    confirmarExclusao({
      titulo: 'Remover entrada',
      descricao: `"${e.descricao}" de ${brl(e.valor)} será apagada. Isso muda o rateio dos meses que usam renda como base.`,
      aoConfirmar: () => remover.mutate(e.id),
    });

  const tipo = form.getValues().tipo;

  const Lista = ({ itens, detalhe }: { itens: EntradaDTO[]; detalhe: (e: EntradaDTO) => string }) => (
    <Stack gap={0}>
      {itens.map((e, i) => (
        <Group
          key={e.id} wrap="nowrap" py="sm"
          style={i < itens.length - 1 ? { borderBottom: '1px solid #EEF1EC' } : undefined}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text>{e.descricao}</Text>
            <Text size="sm" c="dimmed">{detalhe(e)}</Text>
          </div>
          <Text className="num" fw={600}>{brl(e.valor)}</Text>
          <ActionIcon
            variant="subtle" color="tijolo" aria-label={`Remover ${e.descricao}`}
            onClick={() => pedirExclusao(e)}
          >
            ✕
          </ActionIcon>
        </Group>
      ))}
    </Stack>
  );

  return (
    <>
      <Cabecalho
        titulo="Minhas entradas"
        descricao="Recorrentes valem todo mês. Pontuais entram só no mês da data."
        acao={<Metrica rotulo={`Total em ${mesLabel(mes)}`} valor={brl(total)} />}
      />

      <Card component="form" onSubmit={enviar} mb="lg">
        <Title order={3} mb="md">Lançar entrada</Title>
        <Grid gap="md" align="flex-end">
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            <Select
              label="Tipo" allowDeselect={false}
              data={[
                { value: 'recorrente', label: 'Recorrente' },
                { value: 'pontual', label: 'Pontual' },
              ]}
              key={form.key('tipo')} {...form.getInputProps('tipo')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Descrição" placeholder="Salário, freela, aluguel recebido…"
              key={form.key('descricao')} {...form.getInputProps('descricao')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            <NumberInput
              label="Valor" prefix="R$ " decimalScale={2} decimalSeparator="," thousandSeparator="."
              min={0} placeholder="0,00" key={form.key('valor')} {...form.getInputProps('valor')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            {tipo === 'recorrente' ? (
              <NumberInput label="Dia do mês" min={1} max={31} key={form.key('diaDoMes')} {...form.getInputProps('diaDoMes')} />
            ) : (
              <DatePickerInput label="Data" valueFormat="DD/MM/YYYY" key={form.key('data')} {...form.getInputProps('data')} />
            )}
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Button type="submit" loading={criar.isPending} fullWidth>Adicionar</Button>
          </Grid.Col>
        </Grid>
      </Card>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Recorrentes</Title>
            {recorrentes.length === 0 ? (
              <Vazio>Nenhuma entrada recorrente ainda.</Vazio>
            ) : (
              <Lista itens={recorrentes} detalhe={(e) => `todo dia ${e.diaDoMes}`} />
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Pontuais de {mesLabel(mes)}</Title>
            {pontuais.length === 0 ? (
              <Vazio>Nenhuma entrada pontual neste mês.</Vazio>
            ) : (
              <Lista itens={pontuais} detalhe={(e) => (e.data ?? '').split('-').reverse().join('/')} />
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}
