import type { CSSProperties, ReactNode } from 'react';
import {
  ActionIcon,
  type ActionIconProps,
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
import { CATEGORIES, categoryOf, type CategoryId, type ExpenseType } from '@shared/domain';
import { brl, monthLabel, pct, shiftMonth } from '@shared/format';
import { useValuesHidden } from '../hideValues';

/**
 * A dark card's surface and ink. Hidden values need a bar lighter than the card,
 * not darker — so the card redefines what `.money-mask` tints itself from.
 */
export const DARK_CARD = {
  borderColor: 'var(--gf-ink)',
  color: '#fff',
  '--gf-surface': 'var(--gf-ink)',
  '--gf-on': '#fff',
  '--gf-mask-mix': '26%',
} as CSSProperties;

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

/**
 * A money amount on screen. With "hide values" on, the amount never reaches
 * the DOM (no selecting or reading it back) and a bar takes its place, tinted
 * from the surface it sits on — see `.money-mask` in base.css.
 */
export function Money({ value }: { value: number }) {
  const [hidden] = useValuesHidden();
  if (hidden) return <span className="money-mask" role="img" aria-label="valor oculto" />;
  return <>{brl(value)}</>;
}

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {off ? (
      <>
        <path d="M10.7 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2" />
        <path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        <path d="M2 2l20 20" />
      </>
    ) : (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

/** The switch for `Money`; `onDark` for the navigation rail. */
export function HideValuesToggle({ onDark, ...rest }: { onDark?: boolean } & Omit<ActionIconProps, 'children'>) {
  const [hidden, toggle] = useValuesHidden();
  const label = hidden ? 'Mostrar valores' : 'Ocultar valores';
  return (
    <ActionIcon
      variant={onDark ? (hidden ? 'filled' : 'subtle') : 'default'}
      color={onDark ? '#2A5B4F' : undefined}
      c={onDark ? (hidden ? '#fff' : '#B9CCC5') : undefined}
      size="lg"
      aria-label={label}
      aria-pressed={hidden}
      title={label}
      onClick={toggle}
      {...rest}
    >
      <EyeIcon off={hidden} />
    </ActionIcon>
  );
}

export function MonthNav({
  month,
  setMonth,
  min,
  max,
}: {
  month: string;
  setMonth: (m: string) => void;
  /** Earliest/latest month the account has data for — e.g. account creation and "now". */
  min?: string;
  max?: string;
}) {
  return (
    <Group gap="xs" wrap="nowrap">
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Mês anterior"
        disabled={min !== undefined && month <= min}
        onClick={() => setMonth(shiftMonth(month, -1))}
      >
        ←
      </ActionIcon>
      <Text className="num" fw={600} ta="center" tt="capitalize" w={140} maw="34vw" miw={104} truncate>
        {monthLabel(month)}
      </Text>
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Próximo mês"
        disabled={max !== undefined && month >= max}
        onClick={() => setMonth(shiftMonth(month, 1))}
      >
        →
      </ActionIcon>
    </Group>
  );
}

export function Categories({
  amounts,
  onSelect,
}: {
  amounts: Record<string, number>;
  /** Present only where a category can drill down into its expenses. */
  onSelect?: (categoryId: CategoryId) => void;
}) {
  const total = Object.values(amounts).reduce((s, v) => s + v, 0);
  const items = CATEGORIES.map((c) => ({ ...c, v: amounts[c.id] || 0 }))
    .filter((c) => c.v > 0)
    .sort((a, b) => b.v - a.v);

  if (!items.length) return <Empty>Sem gastos lançados neste mês.</Empty>;

  return (
    <Stack gap="xs">
      {items.map((c) => (
        <Group
          key={c.id}
          gap="sm"
          wrap="nowrap"
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onClick={onSelect ? () => onSelect(c.id) : undefined}
          onKeyDown={
            onSelect
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(c.id);
                  }
                }
              : undefined
          }
          style={onSelect ? { cursor: 'pointer' } : undefined}
        >
          <Group gap={7} w={110} wrap="nowrap" style={{ flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
            <Text size="md">{c.name}</Text>
          </Group>
          <Progress value={(c.v / total) * 100} color={c.color} size="sm" radius="sm" style={{ flex: 1 }} />
          <Text className="num" size="sm" ta="right" w={110} style={{ flexShrink: 0 }}>
            {pct(c.v / total)} <Text span c="dimmed" size="sm">· <Money value={c.v} /></Text>
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

const EXPENSE_TYPE_LABEL = { fixed: 'Fixo', optional: 'Opcional', oneOff: 'Pontual', debt: 'Dívida' } as const;
const EXPENSE_TYPE_COLOR = { fixed: 'petrol', optional: 'mustard', oneOff: 'grape', debt: 'indigo' } as const;

export function ExpenseTypeChip({ type, clickable }: { type: ExpenseType; clickable?: boolean }) {
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
    <Group justify="space-between" align="center" wrap="wrap" mb="lg" gap="sm">
      <div>
        <Title order={1} className="page-title">{title}</Title>
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
  value: ReactNode;
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

export function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
