import type { ReactNode } from 'react';
import {
  ActionIcon,
  Avatar as MAvatar,
  Badge,
  Center,
  Group,
  Loader,
  Progress,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { CATEGORIAS, catOf } from '@shared/dominio';
import { brl, mesLabel, pct, shiftMes } from '@shared/formato';

export interface Membro {
  id: string;
  nome: string;
  cor: string;
}

export function Avatar({ user, lg }: { user: Membro; lg?: boolean }) {
  return (
    <MAvatar size={lg ? 40 : 30} radius="xl" styles={{ placeholder: { background: user.cor, color: '#fff' } }}>
      {user.nome[0]}
    </MAvatar>
  );
}

export function MesNav({ mes, setMes }: { mes: string; setMes: (m: string) => void }) {
  return (
    <Group gap="xs">
      <ActionIcon variant="default" size="lg" aria-label="Mês anterior" onClick={() => setMes(shiftMes(mes, -1))}>
        ←
      </ActionIcon>
      <Text className="num" fw={600} ta="center" tt="capitalize" w={140}>
        {mesLabel(mes)}
      </Text>
      <ActionIcon variant="default" size="lg" aria-label="Próximo mês" onClick={() => setMes(shiftMes(mes, 1))}>
        →
      </ActionIcon>
    </Group>
  );
}

export function Categorias({ mapa }: { mapa: Record<string, number> }) {
  const total = Object.values(mapa).reduce((s, v) => s + v, 0);
  const itens = CATEGORIAS.map((c) => ({ ...c, v: mapa[c.id] || 0 }))
    .filter((c) => c.v > 0)
    .sort((a, b) => b.v - a.v);

  if (!itens.length) return <Vazio>Sem gastos lançados neste mês.</Vazio>;

  return (
    <Stack gap="xs">
      {itens.map((c) => (
        <Group key={c.id} gap="sm" wrap="nowrap">
          <Group gap={7} w={110} wrap="nowrap" style={{ flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c.cor, flexShrink: 0 }} />
            <Text size="md">{c.nome}</Text>
          </Group>
          <Progress value={(c.v / total) * 100} color={c.cor} size="sm" radius="sm" style={{ flex: 1 }} />
          <Text className="num" size="sm" ta="right" w={110} style={{ flexShrink: 0 }}>
            {pct(c.v / total)} <Text span c="dimmed" size="sm">· {brl(c.v)}</Text>
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

export function ChipCategoria({ id }: { id: string }) {
  const c = catOf(id);
  return (
    <Badge
      variant="light" radius="sm" tt="none" fw={500}
      leftSection={<div style={{ width: 7, height: 7, borderRadius: 2, background: c.cor }} />}
      styles={{ root: { background: '#EDF0EB', color: 'var(--gf-ink-soft)' } }}
    >
      {c.nome}
    </Badge>
  );
}

export function ChipTipoGasto({ tipo }: { tipo: 'fixo' | 'opcional' }) {
  return (
    <Badge color={tipo === 'fixo' ? 'petrol' : 'mostarda'} variant="light" radius="sm" tt="none" fw={500}>
      {tipo === 'fixo' ? 'Fixo' : 'Opcional'}
    </Badge>
  );
}

export function Cabecalho({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-start" wrap="wrap" mb="lg">
      <div>
        <Title order={1}>{titulo}</Title>
        {descricao && <Text c="dimmed" size="md" mt={4}>{descricao}</Text>}
      </div>
      {acao}
    </Group>
  );
}

export function Metrica({
  rotulo,
  valor,
  detalhe,
  cor,
}: {
  rotulo: string;
  valor: string;
  detalhe?: ReactNode;
  cor?: string;
}) {
  return (
    <>
      <Text size="sm" c="dimmed">{rotulo}</Text>
      <Text className="num" fz={26} fw={600} mt={4} c={cor}>{valor}</Text>
      {detalhe && <Text size="sm" c="dimmed" mt={4}>{detalhe}</Text>}
    </>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <Center
      p="xl"
      style={{ border: '1px dashed var(--gf-line)', borderRadius: 12, color: 'var(--gf-ink-faint)' }}
    >
      <Text size="md" c="dimmed">{children}</Text>
    </Center>
  );
}

export function Carregando() {
  return (
    <Center py="xl">
      <Loader color="petrol" />
    </Center>
  );
}
