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
import { CATEGORIES, categoryOf } from '@shared/domain';
import { brl, monthLabel, pct, shiftMonth } from '@shared/format';

export interface Member {
  id: string;
  name: string;
  color: string;
}

export function Avatar({ user, lg }: { user: Member; lg?: boolean }) {
  return (
    <MAvatar size={lg ? 40 : 30} radius="xl" styles={{ placeholder: { background: user.color, color: '#fff' } }}>
      {user.name[0]}
    </MAvatar>
  );
}

export function MonthNav({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  return (
    <Group gap="xs">
      <ActionIcon variant="default" size="lg" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}>
        ←
      </ActionIcon>
      <Text className="num" fw={600} ta="center" tt="capitalize" w={140}>
        {monthLabel(month)}
      </Text>
      <ActionIcon variant="default" size="lg" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}>
        →
      </ActionIcon>
    </Group>
  );
}

export function Categories({ amounts }: { amounts: Record<string, number> }) {
  const total = Object.values(amounts).reduce((s, v) => s + v, 0);
  const items = CATEGORIES.map((c) => ({ ...c, v: amounts[c.id] || 0 }))
    .filter((c) => c.v > 0)
    .sort((a, b) => b.v - a.v);

  if (!items.length) return <Empty>Sem gastos lançados neste mês.</Empty>;

  return (
    <Stack gap="xs">
      {items.map((c) => (
        <Group key={c.id} gap="sm" wrap="nowrap">
          <Group gap={7} w={110} wrap="nowrap" style={{ flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
            <Text size="md">{c.name}</Text>
          </Group>
          <Progress value={(c.v / total) * 100} color={c.color} size="sm" radius="sm" style={{ flex: 1 }} />
          <Text className="num" size="sm" ta="right" w={110} style={{ flexShrink: 0 }}>
            {pct(c.v / total)} <Text span c="dimmed" size="sm">· {brl(c.v)}</Text>
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

/** `#rrggbb` + alpha → `rgba(...)`, so a badge can tint its own background from a hex token. */
export const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * A solid card background + a colored border, not just a pale tint: needs to
 * stand out over the green/red row tints that mark complete/incomplete
 * expenses, not just over plain white.
 */
export function CategoryChip({ id, clickable }: { id: string; clickable?: boolean }) {
  const c = categoryOf(id);
  return (
    <Badge
      variant="light" radius="sm" tt="none" fw={600} fz="sm"
      leftSection={<div style={{ width: 7, height: 7, borderRadius: 2, background: c.color }} />}
      styles={{
        root: {
          background: 'var(--gf-card)',
          color: 'var(--gf-ink)',
          border: `1.5px solid ${hexToRgba(c.color, 0.55)}`,
          // Badge hardcodes `cursor: default` on its own root, which wins over
          // an ancestor button's `cursor: pointer` — only an inline style on
          // the badge itself can override it.
          ...(clickable ? { cursor: 'pointer' } : {}),
        },
      }}
    >
      {c.name}
    </Badge>
  );
}

const EXPENSE_TYPE_LABEL = { fixed: 'Fixo', optional: 'Opcional', oneOff: 'Pontual' } as const;
const EXPENSE_TYPE_COLOR = { fixed: 'petrol', optional: 'mustard', oneOff: 'grape' } as const;

export function ExpenseTypeChip({ type, clickable }: { type: 'fixed' | 'optional' | 'oneOff'; clickable?: boolean }) {
  return (
    <Badge
      color={EXPENSE_TYPE_COLOR[type]} variant="filled" radius="sm" tt="none" fw={600} fz="sm"
      styles={clickable ? { root: { cursor: 'pointer' } } : undefined}
    >
      {EXPENSE_TYPE_LABEL[type]}
    </Badge>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="center" wrap="wrap" mb="lg">
      <div>
        <Title order={1}>{title}</Title>
        {description && <Text c="dimmed" size="md" mt={4}>{description}</Text>}
      </div>
      {action}
    </Group>
  );
}

export function Metric({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: string;
  detail?: ReactNode;
  color?: string;
}) {
  return (
    <>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text className="num" fz={26} fw={600} mt={4} c={color}>{value}</Text>
      {detail && <Text size="sm" c="dimmed" mt={4}>{detail}</Text>}
    </>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Center
      p="xl"
      style={{ border: '1px dashed var(--gf-line)', borderRadius: 12, color: 'var(--gf-ink-faint)' }}
    >
      <Text size="md" c="dimmed">{children}</Text>
    </Center>
  );
}

export function Loading() {
  return (
    <Center py="xl">
      <Loader color="petrol" />
    </Center>
  );
}
