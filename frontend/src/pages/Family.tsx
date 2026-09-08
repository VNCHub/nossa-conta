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
import type { RuleDTO } from '@shared/contracts';
import { RULE_TYPES, type RuleType } from '@shared/domain';
import { monthLabel, pct } from '@shared/format';
import { api } from '../api/client';
import { keys, useFamily, useMembers, useAppMutation, useRules } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Avatar, PageHeader, Loading, Empty } from '../components/ui';
import { notifyError, notifySuccess, confirmDelete } from '../feedback';
import { useMonth } from '../useMonth';

const TYPE_LABEL: Record<RuleType, string> = {
  equal: 'Partes iguais',
  income: 'Renda recorrente',
  surplus: 'Sobra livre',
  fixed: 'Percentual fixo',
  meter: 'Medidor mensal',
};

export default function Family() {
  const [month] = useMonth();
  const { user } = useAuth();
  const { data: family } = useFamily();
  const { data: members } = useMembers();
  const rules = useRules();

  const invalidate = [keys.rules, keys.statement(month)];

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { name: '', type: 'equal' as RuleType, unit: 'km' },
    validate: {
      name: (v) => (v.trim() ? null : 'Dê um nome à regra.'),
      unit: (v, vals) =>
        vals.type === 'meter' && !v.trim() ? 'Informe a unidade medida.' : null,
    },
  });

  const create = useAppMutation(
    (body: Record<string, unknown>) => api.post<RuleDTO>('/regras', body),
    invalidate,
    {
      onSuccess: () => {
        form.setFieldValue('name', '');
        notifySuccess('Regra criada.');
      },
      onError: (e) => notifyError(e.message),
    },
  );

  const del = useAppMutation((id: string) => api.delete(`/regras/${id}`), invalidate, {
    onSuccess: () => notifySuccess('Regra excluída.'),
    onError: (e) => notifyError(e.message),
  });

  const saveWeights = useAppMutation(
    (v: { id: string; weights: { userId: string; percent: number }[] }) =>
      api.put<RuleDTO>(`/regras/${v.id}/pesos`, { weights: v.weights }),
    invalidate,
    { onError: (e) => notifyError(e.message) },
  );

  const saveMeasurements = useAppMutation(
    (v: { id: string; measurements: { userId: string; amount: number }[] }) =>
      api.put<RuleDTO>(`/regras/${v.id}/medicoes?mes=${month}`, { measurements: v.measurements }),
    invalidate,
    { onError: (e) => notifyError(e.message) },
  );

  if (!rules.data || !members || !family || !user) {
    return rules.error ? <Empty>{rules.error.message}</Empty> : <Loading />;
  }

  const changeWeight = (r: RuleDTO, userId: string, value: number) =>
    saveWeights.mutate({
      id: r.id,
      weights: members.map((m) => ({
        userId: m.id,
        percent: m.id === userId ? value : (r.weights?.[m.id] ?? 0),
      })),
    });

  const changeMeasurement = (r: RuleDTO, userId: string, value: number) => {
    const forMonth = r.measurements?.[month] ?? {};
    saveMeasurements.mutate({
      id: r.id,
      measurements: members
        .map((m) => ({ userId: m.id, amount: m.id === userId ? value : (forMonth[m.id] ?? 0) }))
        .filter((m) => m.amount > 0),
    });
  };

  const askDelete = (r: RuleDTO) =>
    confirmDelete({
      title: 'Excluir regra de rateio',
      description: `A regra "${r.name}" deixará de aparecer no formulário de gasto.`,
      onConfirm: () => del.mutate(r.id),
    });

  const type = form.getValues().type;

  return (
    <>
      <PageHeader
        title={family.name}
        description="Membros, convite e as regras de rateio que aparecem no formulário de gasto."
      />

      <Grid gap="lg" mb="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Title order={3} mb="sm">Membros</Title>
            <Stack gap={0}>
              {members.map((m, i) => (
                <Group
                  key={m.id} wrap="nowrap" py="sm"
                  style={i < members.length - 1 ? { borderBottom: '1px solid #EEF1EC' } : undefined}
                >
                  <Avatar user={m} lg />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600}>{m.name}{m.id === user.id ? ' (você)' : ''}</Text>
                    <Text size="sm" c="dimmed" truncate>{m.email}</Text>
                  </div>
                  {family.createdById === m.id && (
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
                  {family.inviteCode}
                </Text>
              </Paper>
              <CopyButton value={family.inviteCode} timeout={1800}>
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
          {rules.data.map((r) => (
            <Paper key={r.id} withBorder radius="lg" p="md">
              <Group justify="space-between" align="flex-start" wrap="wrap" mb="sm">
                <div>
                  <Text fw={600} fz="lg">{r.name}</Text>
                  <Text size="sm" c="dimmed">{r.description}</Text>
                </div>
                <Group gap="xs">
                  <Badge variant="light" color="gray" tt="none" fw={500}>
                    {r.inUse ?? 0} gasto(s) usando
                  </Badge>
                  {(r.inUse ?? 0) === 0 && rules.data.length > 1 && (
                    <Button size="xs" variant="light" color="brick" onClick={() => askDelete(r)}>
                      Excluir
                    </Button>
                  )}
                </Group>
              </Group>

              {r.type === 'fixed' && (
                <>
                  <Grid gap="sm">
                    {members.map((m) => (
                      <Grid.Col key={m.id} span={{ base: 6, md: 3 }}>
                        <NumberInput
                          label={`${m.name} (%)`} min={0} max={100} suffix="%"
                          defaultValue={r.weights?.[m.id] ?? 0}
                          onBlur={(e) => changeWeight(r, m.id, Number(e.currentTarget.value.replace('%', '')) || 0)}
                        />
                      </Grid.Col>
                    ))}
                  </Grid>
                  <Text size="sm" c="dimmed" mt="sm">
                    Soma atual: {Object.values(r.weights ?? {}).reduce((s, v) => s + v, 0)}%. Se não fechar
                    100, o app normaliza proporcionalmente entre quem participa do gasto.
                  </Text>
                </>
              )}

              {r.type === 'meter' && (
                <>
                  <Text size="sm" c="dimmed" mb="sm">
                    Medição de {monthLabel(month)} — unidade: {r.unit}
                  </Text>
                  <Grid gap="sm">
                    {members.map((m) => {
                      const forMonth = r.measurements?.[month] ?? {};
                      const sum = Object.values(forMonth).reduce((s, v) => s + v, 0);
                      return (
                        <Grid.Col key={m.id} span={{ base: 6, md: 3 }}>
                          <NumberInput
                            label={`${m.name} (${r.unit})`} min={0} placeholder="0"
                            key={`${r.id}-${m.id}-${month}-${forMonth[m.id] ?? ''}`}
                            defaultValue={forMonth[m.id] ?? ''}
                            description={sum ? pct((forMonth[m.id] ?? 0) / sum) : 'sem medição'}
                            inputWrapperOrder={['label', 'input', 'description']}
                            onBlur={(e) => changeMeasurement(r, m.id, Number(e.currentTarget.value) || 0)}
                          />
                        </Grid.Col>
                      );
                    })}
                  </Grid>
                </>
              )}

              {['equal', 'income', 'surplus'].includes(r.type) && (
                <Text size="sm" c="dimmed">
                  Calculada automaticamente a partir dos lançamentos do mês — não precisa configurar.
                </Text>
              )}
            </Paper>
          ))}
        </Stack>
      </Card>

      <Card component="form" onSubmit={form.onSubmit((v) =>
        create.mutate({
          name: v.name.trim(),
          type: v.type,
          ...(v.type === 'meter' ? { unit: v.unit.trim() } : {}),
        }),
      )}>
        <Title order={3} mb="md">Criar regra</Title>
        <Grid gap="md" align="flex-end">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <TextInput
              label="Nome" placeholder="Ex.: Mercado por pessoa em casa"
              key={form.key('name')} {...form.getInputProps('name')}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Base do cálculo" allowDeselect={false}
              data={RULE_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
              key={form.key('type')} {...form.getInputProps('type')}
            />
          </Grid.Col>
          {type === 'meter' && (
            <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
              <TextInput
                label="Unidade medida" placeholder="km, dias, litros…"
                key={form.key('unit')} {...form.getInputProps('unit')}
              />
            </Grid.Col>
          )}
          <Grid.Col span={{ base: 12, md: 2 }}>
            <Button type="submit" loading={create.isPending} fullWidth>Criar regra</Button>
          </Grid.Col>
        </Grid>
      </Card>
    </>
  );
}
