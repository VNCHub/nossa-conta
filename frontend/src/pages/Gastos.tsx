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
import type { GastoDTO } from '@shared/contratos';
import { CATEGORIAS, PAGAMENTOS } from '@shared/dominio';
import { brl, mesLabel, pct } from '@shared/formato';
import { api } from '../api/client';
import { chaves, useConsolidado, useGastos, useMembros, useMutacao, useRegras } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Avatar, Cabecalho, Carregando, ChipCategoria, ChipTipoGasto, Metrica, Vazio } from '../components/ui';
import { avisarErro, avisarSucesso, confirmarExclusao } from '../feedback';
import { useMes } from '../useMes';

type Filtro = 'todos' | 'meus' | 'divididos';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Gastos() {
  const [mes] = useMes();
  const { usuario } = useAuth();
  const { data: membros } = useMembros();
  const { data: regras } = useRegras();
  const gastos = useGastos(mes);
  const consolidado = useConsolidado(mes);
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const invalidar = [chaves.gastos(mes), chaves.consolidado(mes)];

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      data: new Date(`${mes}-15T12:00:00`),
      pagamento: 'Crédito',
      categoria: 'comida',
      tipoGasto: 'fixo',
      descricao: '',
      valor: '' as string | number,
      dividir: false,
      participantes: usuario ? [usuario.id] : [],
      regraId: '',
    },
    validate: {
      descricao: (v) => (v.trim() ? null : 'Descreva o gasto.'),
      valor: (v) => (Number(v) > 0 ? null : 'Informe um valor maior que zero.'),
      participantes: (v, vals) =>
        vals.dividir && v.length === 0 ? 'Escolha com quem o gasto será dividido.' : null,
      regraId: (v, vals) => (vals.dividir && !v ? 'Escolha a regra de rateio.' : null),
    },
  });

  const criar = useMutacao(
    (corpo: Record<string, unknown>) => api.post<GastoDTO>('/gastos', corpo),
    invalidar,
    {
      onSuccess: () => {
        form.setFieldValue('descricao', '');
        form.setFieldValue('valor', '');
        avisarSucesso('Gasto lançado.');
      },
      onError: (e) => avisarErro(e.message),
    },
  );

  const remover = useMutacao((id: string) => api.delete(`/gastos/${id}`), invalidar, {
    onSuccess: () => avisarSucesso('Gasto removido.'),
    onError: (e) => avisarErro(e.message),
  });

  if (!gastos.data || !membros || !regras) {
    return gastos.error ? <Vazio>{gastos.error.message}</Vazio> : <Carregando />;
  }

  // A regra padrão só existe depois que /regras responde.
  if (!form.getValues().regraId && regras.length) {
    form.setFieldValue('regraId', regras[0].id);
  }

  const membroDe = (id: string) => membros.find((m) => m.id === id);
  const cotasDe = (id: string) => consolidado.data?.linhas.find((l) => l.id === id)?.cotas ?? {};

  const lista = gastos.data.filter((g) => {
    if (filtro === 'meus') return g.userId === usuario?.id;
    if (filtro === 'divididos') return g.dividir;
    return true;
  });
  const total = lista.reduce((s, g) => s + g.valor, 0);

  const enviar = form.onSubmit((v) =>
    criar.mutate({
      data: iso(v.data),
      pagamento: v.pagamento,
      categoria: v.categoria,
      tipoGasto: v.tipoGasto,
      descricao: v.descricao.trim(),
      valor: Number(v.valor),
      dividir: v.dividir,
      participantes: v.dividir ? v.participantes : [],
      regraId: v.dividir ? v.regraId : null,
    }),
  );

  const pedirExclusao = (g: GastoDTO) =>
    confirmarExclusao({
      titulo: 'Excluir gasto',
      descricao: `"${g.descricao}" de ${brl(g.valor)}${g.dividir ? ', dividido com outras pessoas,' : ''} será apagado e o acerto do mês vai mudar.`,
      aoConfirmar: () => remover.mutate(g.id),
    });

  const dividir = form.getValues().dividir;
  const regraEscolhida = regras.find((r) => r.id === form.getValues().regraId);

  return (
    <>
      <Cabecalho
        titulo="Gastos"
        descricao={`Lançamentos da família em ${mesLabel(mes)}.`}
        acao={<Metrica rotulo="Total listado" valor={brl(total)} />}
      />

      <Card component="form" onSubmit={enviar} mb="lg">
        <Title order={3} mb="md">Lançar gasto</Title>
        <Grid gap="md">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <DatePickerInput label="Data" valueFormat="DD/MM/YYYY" key={form.key('data')} {...form.getInputProps('data')} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Pagamento" allowDeselect={false} data={[...PAGAMENTOS]}
              key={form.key('pagamento')} {...form.getInputProps('pagamento')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Categoria" allowDeselect={false}
              data={CATEGORIAS.map((c) => ({ value: c.id, label: c.nome }))}
              key={form.key('categoria')} {...form.getInputProps('categoria')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Tipo" allowDeselect={false}
              data={[
                { value: 'fixo', label: 'Gasto fixo' },
                { value: 'opcional', label: 'Gasto opcional' },
              ]}
              key={form.key('tipoGasto')} {...form.getInputProps('tipoGasto')}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Descrição" placeholder="Aluguel, mercado, cinema…"
              key={form.key('descricao')} {...form.getInputProps('descricao')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <NumberInput
              label="Valor" prefix="R$ " decimalScale={2} decimalSeparator="," thousandSeparator="."
              min={0} placeholder="0,00" key={form.key('valor')} {...form.getInputProps('valor')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Checkbox
              label="Dividir com outras pessoas" pb={8}
              key={form.key('dividir')} {...form.getInputProps('dividir', { type: 'checkbox' })}
            />
          </Grid.Col>

          {dividir && (
            <>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Text size="sm" fw={500} c="dimmed" mb={5}>Com quem</Text>
                <Chip.Group
                  multiple
                  key={form.key('participantes')}
                  {...form.getInputProps('participantes')}
                >
                  <Group gap="xs">
                    {membros.map((m) => (
                      <Chip key={m.id} value={m.id} color="petrol" variant="outline">{m.nome}</Chip>
                    ))}
                  </Group>
                </Chip.Group>
                {form.errors.participantes && (
                  <Text size="sm" c="tijolo" mt={5}>{form.errors.participantes}</Text>
                )}
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Select
                  label="Rateio" allowDeselect={false}
                  description={regraEscolhida?.descricao}
                  data={regras.map((r) => ({ value: r.id, label: r.nome }))}
                  key={form.key('regraId')} {...form.getInputProps('regraId')}
                />
              </Grid.Col>
            </>
          )}

          <Grid.Col span={12}>
            <Button type="submit" loading={criar.isPending}>Adicionar gasto</Button>
          </Grid.Col>
        </Grid>
      </Card>

      <Card>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Title order={3}>Lançamentos</Title>
          <SegmentedControl
            value={filtro}
            onChange={(v) => setFiltro(v as Filtro)}
            data={[
              { value: 'todos', label: 'Todos' },
              { value: 'meus', label: 'Meus' },
              { value: 'divididos', label: 'Divididos' },
            ]}
          />
        </Group>

        {lista.length === 0 ? (
          <Vazio>Nenhum gasto neste filtro.</Vazio>
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
                {lista.map((g) => {
                  const dono = membroDe(g.userId);
                  const cotas = cotasDe(g.id);
                  return (
                    <Table.Tr key={g.id}>
                      <Table.Td className="num">{g.data.split('-').reverse().join('/')}</Table.Td>
                      <Table.Td>
                        <Group gap={7} wrap="nowrap">
                          {dono && <Avatar user={dono} />}
                          <Text size="md">{dono?.nome ?? '—'}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>{g.descricao}</Table.Td>
                      <Table.Td><ChipCategoria id={g.categoria} /></Table.Td>
                      <Table.Td><ChipTipoGasto tipo={g.tipoGasto} /></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{g.pagamento}</Text></Table.Td>
                      <Table.Td>
                        {!g.dividir ? (
                          <Text size="sm" c="dimmed">só de quem pagou</Text>
                        ) : (
                          <Stack gap={2}>
                            {g.participantes.map((p) => (
                              <Text key={p} size="sm" c="dimmed">
                                {membroDe(p)?.nome ?? '—'} · {cotas[p] !== undefined ? pct(cotas[p]) : '—'}
                              </Text>
                            ))}
                          </Stack>
                        )}
                      </Table.Td>
                      <Table.Td className="num" ta="right" fw={600}>{brl(g.valor)}</Table.Td>
                      <Table.Td>
                        {g.userId === usuario?.id && (
                          <ActionIcon
                            variant="subtle" color="tijolo" aria-label={`Excluir ${g.descricao}`}
                            onClick={() => pedirExclusao(g)}
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
