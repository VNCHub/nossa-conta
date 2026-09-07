import {
  Alert,
  Badge,
  Button,
  Card,
  CopyButton,
  Grid,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { RegraDTO } from '@shared/contratos';
import { TIPOS_REGRA, type TipoRegra } from '@shared/dominio';
import { mesLabel, pct } from '@shared/formato';
import { api } from '../api/client';
import { chaves, useFamilia, useMembros, useMutacao, useRegras } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Avatar, Cabecalho, Carregando, Vazio } from '../components/ui';
import { avisarErro, avisarSucesso, confirmarExclusao } from '../feedback';
import { useMes } from '../useMes';

const ROTULO_TIPO: Record<TipoRegra, string> = {
  igual: 'Partes iguais',
  renda: 'Renda recorrente',
  sobra: 'Sobra livre',
  fixo: 'Percentual fixo',
  medidor: 'Medidor mensal',
};

export default function Familia() {
  const [mes] = useMes();
  const { usuario } = useAuth();
  const { data: familia } = useFamilia();
  const { data: membros } = useMembros();
  const regras = useRegras();

  const invalidar = [chaves.regras, chaves.consolidado(mes)];

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { nome: '', tipo: 'igual' as TipoRegra, unidade: 'km' },
    validate: {
      nome: (v) => (v.trim() ? null : 'Dê um nome à regra.'),
      unidade: (v, vals) =>
        vals.tipo === 'medidor' && !v.trim() ? 'Informe a unidade medida.' : null,
    },
  });

  const criar = useMutacao(
    (corpo: Record<string, unknown>) => api.post<RegraDTO>('/regras', corpo),
    invalidar,
    {
      onSuccess: () => {
        form.setFieldValue('nome', '');
        avisarSucesso('Regra criada.');
      },
      onError: (e) => avisarErro(e.message),
    },
  );

  const excluir = useMutacao((id: string) => api.delete(`/regras/${id}`), invalidar, {
    onSuccess: () => avisarSucesso('Regra excluída.'),
    onError: (e) => avisarErro(e.message),
  });

  const salvarPesos = useMutacao(
    (v: { id: string; pesos: { userId: string; percentual: number }[] }) =>
      api.put<RegraDTO>(`/regras/${v.id}/pesos`, { pesos: v.pesos }),
    invalidar,
    { onError: (e) => avisarErro(e.message) },
  );

  const salvarMedicoes = useMutacao(
    (v: { id: string; medicoes: { userId: string; valor: number }[] }) =>
      api.put<RegraDTO>(`/regras/${v.id}/medicoes?mes=${mes}`, { medicoes: v.medicoes }),
    invalidar,
    { onError: (e) => avisarErro(e.message) },
  );

  if (!regras.data || !membros || !familia || !usuario) {
    return regras.error ? <Vazio>{regras.error.message}</Vazio> : <Carregando />;
  }

  const alterarPeso = (r: RegraDTO, userId: string, valor: number) =>
    salvarPesos.mutate({
      id: r.id,
      pesos: membros.map((m) => ({
        userId: m.id,
        percentual: m.id === userId ? valor : (r.pesos?.[m.id] ?? 0),
      })),
    });

  const alterarMedicao = (r: RegraDTO, userId: string, valor: number) => {
    const doMes = r.medicoes?.[mes] ?? {};
    salvarMedicoes.mutate({
      id: r.id,
      medicoes: membros
        .map((m) => ({ userId: m.id, valor: m.id === userId ? valor : (doMes[m.id] ?? 0) }))
        .filter((m) => m.valor > 0),
    });
  };

  const pedirExclusao = (r: RegraDTO) =>
    confirmarExclusao({
      titulo: 'Excluir regra de rateio',
      descricao: `A regra "${r.nome}" deixará de aparecer no formulário de gasto.`,
      aoConfirmar: () => excluir.mutate(r.id),
    });

  const tipo = form.getValues().tipo;

  return (
    <>
      <Cabecalho
        titulo={familia.nome}
        descricao="Membros, convite e as regras de rateio que aparecem no formulário de gasto."
      />

      <Grid gap="lg" mb="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Membros</Title>
            <Stack gap={0}>
              {membros.map((m, i) => (
                <Group
                  key={m.id} wrap="nowrap" py="sm"
                  style={i < membros.length - 1 ? { borderBottom: '1px solid #EEF1EC' } : undefined}
                >
                  <Avatar user={m} lg />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600}>{m.nome}{m.id === usuario.id ? ' (você)' : ''}</Text>
                    <Text size="sm" c="dimmed" truncate>{m.email}</Text>
                  </div>
                  {familia.criadaPorId === m.id && (
                    <Badge variant="light" color="gray" tt="none" fw={500}>Criou a família</Badge>
                  )}
                </Group>
              ))}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb={6}>Convidar alguém</Title>
            <Text c="dimmed" size="md" mb="md">
              Quem tiver esse código entra na família ao criar a conta e passa a ver estes lançamentos.
            </Text>
            <Group gap="sm" wrap="wrap">
              <Paper bg="#EDF0EB" px="lg" py="sm" radius="lg">
                <Text className="num" fz={22} fw={600} style={{ letterSpacing: '0.06em' }}>
                  {familia.codigoConvite}
                </Text>
              </Paper>
              <CopyButton value={familia.codigoConvite} timeout={1800}>
                {({ copied, copy }) => (
                  <Button variant="default" onClick={copy}>
                    {copied ? 'Código copiado' : 'Copiar código'}
                  </Button>
                )}
              </CopyButton>
            </Group>
            <Alert color="petrol" variant="light" mt="lg">
              Nenhum dado desta família aparece para quem está fora dela: toda consulta da API é
              filtrada pela família de quem está logado.
            </Alert>
          </Card>
        </Grid.Col>
      </Grid>

      <Card mb="lg">
        <Title order={3}>Regras de rateio</Title>
        <Text c="dimmed" size="md" mb="lg">
          São essas opções que aparecem no campo “Rateio” de cada gasto dividido.
        </Text>

        <Stack gap="md">
          {regras.data.map((r) => (
            <Paper key={r.id} withBorder radius="lg" p="md">
              <Group justify="space-between" align="flex-start" wrap="wrap" mb="sm">
                <div>
                  <Text fw={600} fz="lg">{r.nome}</Text>
                  <Text size="sm" c="dimmed">{r.descricao}</Text>
                </div>
                <Group gap="xs">
                  <Badge variant="light" color="gray" tt="none" fw={500}>
                    {r.emUso ?? 0} gasto(s) usando
                  </Badge>
                  {(r.emUso ?? 0) === 0 && regras.data.length > 1 && (
                    <Button size="xs" variant="light" color="tijolo" onClick={() => pedirExclusao(r)}>
                      Excluir
                    </Button>
                  )}
                </Group>
              </Group>

              {r.tipo === 'fixo' && (
                <>
                  <Grid gap="sm">
                    {membros.map((m) => (
                      <Grid.Col key={m.id} span={{ base: 6, md: 3 }}>
                        <NumberInput
                          label={`${m.nome} (%)`} min={0} max={100} suffix="%"
                          defaultValue={r.pesos?.[m.id] ?? 0}
                          onBlur={(e) => alterarPeso(r, m.id, Number(e.currentTarget.value.replace('%', '')) || 0)}
                        />
                      </Grid.Col>
                    ))}
                  </Grid>
                  <Text size="sm" c="dimmed" mt="sm">
                    Soma atual: {Object.values(r.pesos ?? {}).reduce((s, v) => s + v, 0)}%. Se não fechar
                    100, o app normaliza proporcionalmente entre quem participa do gasto.
                  </Text>
                </>
              )}

              {r.tipo === 'medidor' && (
                <>
                  <Text size="sm" c="dimmed" mb="sm">
                    Medição de {mesLabel(mes)} — unidade: {r.unidade}
                  </Text>
                  <Grid gap="sm">
                    {membros.map((m) => {
                      const doMes = r.medicoes?.[mes] ?? {};
                      const soma = Object.values(doMes).reduce((s, v) => s + v, 0);
                      return (
                        <Grid.Col key={m.id} span={{ base: 6, md: 3 }}>
                          <NumberInput
                            label={`${m.nome} (${r.unidade})`} min={0} placeholder="0"
                            key={`${r.id}-${m.id}-${mes}-${doMes[m.id] ?? ''}`}
                            defaultValue={doMes[m.id] ?? ''}
                            description={soma ? pct((doMes[m.id] ?? 0) / soma) : 'sem medição'}
                            inputWrapperOrder={['label', 'input', 'description']}
                            onBlur={(e) => alterarMedicao(r, m.id, Number(e.currentTarget.value) || 0)}
                          />
                        </Grid.Col>
                      );
                    })}
                  </Grid>
                </>
              )}

              {['igual', 'renda', 'sobra'].includes(r.tipo) && (
                <Text size="sm" c="dimmed">
                  Calculada automaticamente a partir dos lançamentos do mês — não precisa configurar.
                </Text>
              )}
            </Paper>
          ))}
        </Stack>
      </Card>

      <Card component="form" onSubmit={form.onSubmit((v) =>
        criar.mutate({
          nome: v.nome.trim(),
          tipo: v.tipo,
          ...(v.tipo === 'medidor' ? { unidade: v.unidade.trim() } : {}),
        }),
      )}>
        <Title order={3} mb="md">Criar regra</Title>
        <Grid gap="md" align="flex-end">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <TextInput
              label="Nome" placeholder="Ex.: Mercado por pessoa em casa"
              key={form.key('nome')} {...form.getInputProps('nome')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Base do cálculo" allowDeselect={false}
              data={TIPOS_REGRA.map((t) => ({ value: t, label: ROTULO_TIPO[t] }))}
              key={form.key('tipo')} {...form.getInputProps('tipo')}
            />
          </Grid.Col>
          {tipo === 'medidor' && (
            <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
              <TextInput
                label="Unidade medida" placeholder="km, dias, litros…"
                key={form.key('unidade')} {...form.getInputProps('unidade')}
              />
            </Grid.Col>
          )}
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Button type="submit" loading={criar.isPending} fullWidth>Criar regra</Button>
          </Grid.Col>
        </Grid>
      </Card>
    </>
  );
}
