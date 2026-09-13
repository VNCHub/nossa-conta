import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  CopyButton,
  Grid,
  Group,
  List,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useQueryClient } from '@tanstack/react-query';
import type { FamilyDTO, MemberDTO, RuleDTO } from '@shared/contracts';
import { RULE_TYPES, type RuleType } from '@shared/domain';
import { monthLabel, pct } from '@shared/format';
import { api } from '../api/client';
import { keys, useFamily, useMembers, useAppMutation, useRules } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Avatar, PageHeader, Loading, Empty } from '../components/ui';
import { notifyError, notifySuccess, confirmDelete, confirmCritical } from '../feedback';
import { useMonth } from '../useMonth';

const TYPE_LABEL: Record<RuleType, string> = {
  equal: 'Partes iguais',
  income: 'Renda recorrente',
  surplus: 'Sobra livre',
  fixed: 'Percentual fixo',
  meter: 'Medidor mensal',
};

// Só os tipos de cálculo automático (sem configuração) têm uma fórmula fixa
// vale a pena explicar — fixed/meter dependem de pesos que a própria família define.
const RULE_FORMULA: Partial<Record<RuleType, string>> = {
  equal: 'Cada participante paga a mesma fração: cota = valor do gasto ÷ número de participantes.',
  income:
    'O peso de cada pessoa é sua entrada recorrente mensal. cota = (entrada recorrente da pessoa ÷ soma das entradas recorrentes de quem participa) × valor do gasto.',
  surplus:
    'O peso de cada pessoa é o que sobra da renda depois dos gastos fixos individuais: livre = entrada recorrente − gastos fixos individuais do mês (nunca menos que zero). cota = (livre da pessoa ÷ soma do livre de quem participa) × valor do gasto.',
};

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export default function Family() {
  const [month] = useMonth();
  const { user, reloadUser } = useAuth();
  const qc = useQueryClient();
  const { data: family } = useFamily();
  const { data: members } = useMembers();
  const rules = useRules();

  const invalidate = [keys.rules, keys.statement(month)];

  const [createOpen, createModal] = useDisclosure(false);

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

  const removeMember = useAppMutation(
    (id: string) => api.delete(`/familias/minha/membros/${id}`),
    // Removing someone rewrites the split of the current month and every month
    // ahead, so invalidate the statement and expenses of every month, not just
    // the one on screen.
    [keys.members, keys.rules, ['statement'], ['expenses']],
    {
      onSuccess: () => notifySuccess('Membro removido da família.'),
      onError: (e) => notifyError(e.message),
    },
  );

  // Dissolve and leave pull the ground out from under this screen: once the
  // account has no family the app renders NoFamily. Clear the cache so the old
  // family's data cannot flash on a later join.
  const dissolve = useAppMutation(() => api.delete('/familias/minha'), [], {
    onSuccess: async () => {
      notifySuccess('Família desfeita.');
      qc.clear();
      await reloadUser();
    },
    onError: (e) => notifyError(e.message),
  });

  const leave = useAppMutation(() => api.post('/familias/minha/sair'), [], {
    onSuccess: async () => {
      notifySuccess('Você saiu da família.');
      qc.clear();
      await reloadUser();
    },
    onError: (e) => notifyError(e.message),
  });

  if (!rules.data || !members || !family || !user) {
    return rules.error ? <Empty>{rules.error.message}</Empty> : <Loading />;
  }

  const isCreator = family.createdById === user.id;

  const askRemoveMember = (m: MemberDTO) =>
    confirmCritical({
      title: 'Remover membro',
      confirmLabel: 'Remover',
      body: (
        <List size="sm" spacing="xs">
          <List.Item>{m.name} perde o acesso a esta família na hora.</List.Item>
          <List.Item>
            Nos meses já fechados nada muda — a participação dela nos gastos fica registrada.
          </List.Item>
          <List.Item>
            Do mês atual em diante ela sai dos rateios: os gastos divididos são recalculados
            sem ela e os que ela pagou viram lançamentos individuais dela.
          </List.Item>
          <List.Item>Para voltar, ela precisa entrar de novo com o código de convite.</List.Item>
        </List>
      ),
      onConfirm: () => removeMember.mutate(m.id),
    });

  const askDissolve = () =>
    confirmCritical({
      title: 'Desfazer a família',
      confirmLabel: 'Desfazer a família',
      requireText: family.name,
      body: (
        <Stack gap="xs">
          <Text fw={600}>Esta ação não pode ser desfeita.</Text>
          <Text size="sm">São apagados para sempre:</Text>
          <List size="sm" spacing={4}>
            <List.Item>todos os gastos compartilhados da família;</List.Item>
            <List.Item>o histórico de fechamentos — quem devia quanto a quem;</List.Item>
            <List.Item>todas as regras de rateio.</List.Item>
          </List>
          <Text size="sm">
            Os {members.length} membros perdem o acesso imediatamente. As entradas pessoais
            de cada um não são afetadas.
          </Text>
        </Stack>
      ),
      onConfirm: () => dissolve.mutate(),
    });

  const askLeave = () => {
    const heir = members.find((m) => m.id !== user.id);
    confirmCritical({
      title: 'Sair da família',
      confirmLabel: 'Sair da família',
      body: (
        <Stack gap="xs">
          <Text size="sm">
            Você perde o acesso aos lançamentos e fechamentos desta família.
          </Text>
          <Text size="sm">
            Nos meses já fechados sua participação nos gastos fica registrada. Do mês atual
            em diante você sai dos rateios: os gastos divididos são recalculados sem você e
            os que você pagou viram lançamentos seus.
          </Text>
          {isCreator && heir && (
            <Text size="sm">
              Como você criou a família, ela passa a ser de {heir.name}, o membro mais antigo.
            </Text>
          )}
          {isCreator && !heir && (
            <Text size="sm" fw={600}>
              Você é o único membro: sair vai desfazer a família e apagar todos os dados dela.
            </Text>
          )}
          <Text size="sm">Para voltar, você vai precisar de um novo convite.</Text>
        </Stack>
      ),
      onConfirm: () => leave.mutate(),
    });
  };

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

  return (
    <>
      <PageHeader
        title={<EditableFamilyName family={family} canEdit={isCreator} />}
        description="Membros, convite e as regras de rateio da família."
      />

      <Tabs defaultValue="geral" keepMounted={false}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="geral">Informações gerais</Tabs.Tab>
          <Tabs.Tab value="rateios">Rateios</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="geral">
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
                      {family.createdById === m.id ? (
                        <Badge variant="light" color="gray" tt="none" fw={500}>Criou a família</Badge>
                      ) : (
                        isCreator && (
                          <Button
                            size="xs" variant="light" color="brick"
                            loading={removeMember.isPending}
                            onClick={() => askRemoveMember(m)}
                          >
                            Remover
                          </Button>
                        )
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

          <Card withBorder style={{ borderColor: 'var(--mantine-color-brick-3)' }}>
            <Title order={3} c="brick" mb={6}>Zona de risco</Title>
            <Text c="dimmed" size="md" mb="md">
              Ações críticas. Cada uma explica o que acontece antes de concluir.
            </Text>
            <Group gap="sm" wrap="wrap">
              <Button
                variant="light" color="brick"
                loading={leave.isPending}
                onClick={askLeave}
              >
                Sair da família
              </Button>
              {isCreator && (
                <Button color="brick" loading={dissolve.isPending} onClick={askDissolve}>
                  Desfazer a família
                </Button>
              )}
            </Group>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="rateios">
          <Card>
            <Group justify="space-between" align="flex-start" wrap="wrap" mb="lg">
              <div>
                <Title order={3}>Regras de rateio</Title>
                <Text c="dimmed" size="md">
                  São essas opções que aparecem no campo “Rateio” de cada gasto dividido.
                </Text>
              </div>
              <Button onClick={createModal.open}>Criar regra</Button>
            </Group>

            <Stack gap="md">
              {rules.data.map((r) => (
                <Paper key={r.id} withBorder radius="lg" p="md">
                  <Group justify="space-between" align="flex-start" wrap="wrap" mb="sm">
                    <div>
                      <Group gap={6} align="center">
                        <Text fw={600} fz="lg">{r.name}</Text>
                        {RULE_FORMULA[r.type] && (
                          <Tooltip label={RULE_FORMULA[r.type]} multiline w={300} withArrow>
                            <ActionIcon
                              variant="subtle" color="gray" size="sm"
                              aria-label={`Como a regra "${r.name}" calcula a cota`}
                            >
                              <InfoIcon />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
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

          <Modal
            opened={createOpen}
            onClose={createModal.close}
            title="Criar regra de rateio"
            centered
          >
            <CreateRuleForm onClose={createModal.close} />
          </Modal>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

function CreateRuleForm({ onClose }: { onClose: () => void }) {
  const [month] = useMonth();

  // Controlled: the "unidade" field appears the moment the base changes to meter.
  const form = useForm({
    mode: 'controlled',
    initialValues: { name: '', type: 'equal' as RuleType, unit: 'km' },
    validate: {
      name: (v) => (v.trim() ? null : 'Dê um nome à regra.'),
      unit: (v, vals) =>
        vals.type === 'meter' && !v.trim() ? 'Informe a unidade medida.' : null,
    },
  });

  const create = useAppMutation(
    (body: Record<string, unknown>) => api.post<RuleDTO>('/regras', body),
    [keys.rules, keys.statement(month)],
    {
      onSuccess: () => {
        notifySuccess('Regra criada.');
        onClose();
      },
      onError: (e) => notifyError(e.message),
    },
  );

  return (
    <form
      onSubmit={form.onSubmit((v) =>
        create.mutate({
          name: v.name.trim(),
          type: v.type,
          ...(v.type === 'meter' ? { unit: v.unit.trim() } : {}),
        }),
      )}
    >
      <Stack gap="md">
        <TextInput
          label="Nome" placeholder="Ex.: Mercado por pessoa em casa" data-autofocus
          {...form.getInputProps('name')}
        />
        <Select
          label="Base do cálculo" allowDeselect={false}
          data={RULE_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
          {...form.getInputProps('type')}
        />
        {form.getValues().type === 'meter' && (
          <TextInput
            label="Unidade medida" placeholder="km, dias, litros…"
            {...form.getInputProps('unit')}
          />
        )}
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={create.isPending}>Criar regra</Button>
        </Group>
      </Stack>
    </form>
  );
}

/**
 * The family name doubles as the page title. Only the creator gets the pencil;
 * for everyone else it is plain text. Editing happens in place — no card, no
 * separate screen.
 */
function EditableFamilyName({ family, canEdit }: { family: FamilyDTO; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(family.name);

  const rename = useAppMutation(
    (name: string) => api.patch<FamilyDTO>('/familias/minha', { name }),
    [keys.family],
    {
      onSuccess: () => {
        notifySuccess('Nome da família atualizado.');
        setEditing(false);
      },
      onError: (e) => notifyError(e.message),
    },
  );

  if (!canEdit) return <>{family.name}</>;

  if (!editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {family.name}
        <ActionIcon
          variant="subtle" color="gray" size="sm"
          aria-label="Editar nome da família"
          onClick={() => {
            setValue(family.name);
            setEditing(true);
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </ActionIcon>
      </span>
    );
  }

  const submit = () => {
    const clean = value.trim();
    if (!clean || clean === family.name) {
      setEditing(false);
      return;
    }
    rename.mutate(clean);
  };

  return (
    <input
      autoFocus
      value={value}
      maxLength={60}
      disabled={rename.isPending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') setEditing(false);
      }}
      style={{
        font: 'inherit',
        color: 'inherit',
        background: 'transparent',
        border: 'none',
        borderBottom: '2px solid var(--mantine-color-petrol-6)',
        outline: 'none',
        padding: 0,
        width: `${Math.max(value.length + 1, 6)}ch`,
        maxWidth: '100%',
      }}
    />
  );
}
