import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  Grid,
  Group,
  Modal,
  NumberInput,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { DatePicker, DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import type { ExpenseDTO, MemberDTO, RuleDTO } from '@shared/contracts';
import {
  CATEGORIES,
  PAYMENT_METHODS,
  categoryOf,
  type CategoryId,
  type ExpenseType,
  type PaymentMethod,
} from '@shared/domain';
import { brl } from '@shared/format';
import { api } from '../../api/client';
import { keys, useExpenses, useMembers, useAppMutation, useRules } from '../../api/hooks';
import { useAuth } from '../../auth/AuthContext';
import { Avatar, Loading, CategoryChip, ExpenseTypeChip, Empty } from '../../components/ui';
import { notifyError, notifySuccess, confirmDelete } from '../../feedback';
import { useMonth } from '../../useMonth';

type Filter = 'all' | 'mine' | 'shared';
type SortKey = 'date' | 'owner' | 'description' | 'category' | 'expenseType' | 'paymentMethod' | 'amount';
type Sort = { key: SortKey; dir: 'asc' | 'desc' };

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Matches the plain <Text size="md"> look exactly, so switching to edit mode causes no layout shift. */
const inlineInputStyle: CSSProperties = {
  font: 'inherit',
  fontSize: 'var(--mantine-font-size-md)',
  color: 'inherit',
  background: 'transparent',
  border: 'none',
  borderBottom: '2px solid var(--mantine-color-petrol-6)',
  outline: 'none',
  padding: 0,
  width: '100%',
};

const firstName = (name: string) => name.split(' ')[0];

/**
 * Matches free text against every visible column — quem pagou, descrição,
 * categoria, tipo, pagamento and valor. The amount is checked as a substring
 * so "100" also finds 100,15 or 1.100,00 — whichever notation (comma or dot)
 * the person happens to type.
 */
const matchesSearch = (e: ExpenseDTO, query: string, ownerName?: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    ownerName ?? '',
    e.description,
    e.category ? categoryOf(e.category).name : '',
    e.expenseType === 'fixed' ? 'Fixo' : e.expenseType === 'optional' ? 'Opcional' : e.expenseType === 'oneOff' ? 'Pontual' : '',
    e.paymentMethod ?? '',
    brl(e.amount),
    e.amount.toFixed(2),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
};

export default function ExpensesLedger() {
  const [month] = useMonth();
  const { user } = useAuth();
  const { data: members } = useMembers();
  const { data: rules } = useRules();
  const expenses = useExpenses(month);
  const [filter, setFilter] = useState<Filter>('mine');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort | null>(null);
  const [createOpen, createModal] = useDisclosure(false);

  const remove = useAppMutation(
    (id: string) => api.delete(`/gastos/${id}`),
    [keys.expenses(month), keys.statement(month)],
    {
      onSuccess: () => notifySuccess('Gasto removido.'),
      onError: (e) => notifyError(e.message),
    },
  );

  // Backing the inline editors: every click-to-edit field saves through this
  // one mutation, sending the whole row back (PATCH replaces wholesale).
  const update = useAppMutation(
    (vars: { id: string; body: Record<string, unknown> }) =>
      api.patch<ExpenseDTO>(`/gastos/${vars.id}`, vars.body),
    [keys.expenses(month), keys.statement(month)],
    {
      onSuccess: () => notifySuccess('Gasto atualizado.'),
      onError: (e) => notifyError(e.message),
    },
  );

  if (!expenses.data || !members || !rules) {
    return expenses.error ? <Empty>{expenses.error.message}</Empty> : <Loading />;
  }

  const patchField = (
    e: ExpenseDTO,
    overrides: Partial<{
      date: string;
      paymentMethod: PaymentMethod | null;
      category: CategoryId | null;
      expenseType: ExpenseType | null;
      description: string;
      amount: number;
      shared: boolean;
      participants: string[];
      ruleId: string | null;
    }>,
  ) => {
    const merged = {
      date: e.date,
      paymentMethod: e.paymentMethod,
      category: e.category,
      expenseType: e.expenseType,
      description: e.description,
      amount: e.amount,
      shared: e.shared,
      participants: e.participants,
      ruleId: e.ruleId,
      ...overrides,
    };
    update.mutate({
      id: e.id,
      body: {
        date: merged.date,
        paymentMethod: merged.paymentMethod || undefined,
        category: merged.category || undefined,
        expenseType: merged.expenseType || undefined,
        description: merged.description.trim(),
        amount: merged.amount > 0 ? merged.amount : undefined,
        shared: merged.shared,
        participants: merged.shared ? merged.participants : [],
        ruleId: merged.shared ? merged.ruleId || undefined : undefined,
      },
    });
  };

  const memberOf = (id: string) => members.find((m) => m.id === id);

  const list = expenses.data.filter((e) => {
    if (filter === 'mine' && e.userId !== user?.id) return false;
    if (filter === 'shared' && !e.shared) return false;
    return matchesSearch(e, search, memberOf(e.userId)?.name);
  });

  const sortValue = (e: ExpenseDTO, key: SortKey): string | number => {
    switch (key) {
      case 'date':
        return e.date;
      case 'owner':
        return memberOf(e.userId)?.name ?? '';
      case 'description':
        return e.description;
      case 'category':
        return e.category ? categoryOf(e.category).name : '';
      case 'expenseType':
        return e.expenseType === 'fixed' ? 'Fixo' : e.expenseType === 'optional' ? 'Opcional' : e.expenseType === 'oneOff' ? 'Pontual' : '';
      case 'paymentMethod':
        return e.paymentMethod ?? '';
      case 'amount':
        return e.amount;
    }
  };

  // Default sort: whoever still needs action (incomplete) comes first, then by date.
  const sorted = [...list].sort((a, b) => {
    if (sort) {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'pt-BR');
      return sort.dir === 'asc' ? cmp : -cmp;
    }
    if (a.complete !== b.complete) return a.complete ? 1 : -1;
    return a.date.localeCompare(b.date);
  });

  // Each click cycles the column through ascending → descending → default.
  const cycleSort = (key: SortKey) =>
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });

  const askDelete = (e: ExpenseDTO) =>
    confirmDelete({
      title: 'Excluir gasto',
      description: `"${e.description || 'Gasto sem descrição'}" de ${brl(e.amount)}${e.shared ? ', dividido com outras pessoas,' : ''} será apagado e o acerto do mês vai mudar.`,
      onConfirm: () => remove.mutate(e.id),
    });

  return (
    <Card>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Title order={3} fz={20}>Lançamentos</Title>
        <Group gap="sm" wrap="wrap">
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            data={[
              { value: 'all', label: 'Todos' },
              { value: 'mine', label: 'Meus' },
              { value: 'shared', label: 'Divididos' },
            ]}
          />
          <Button onClick={createModal.open}>Lançar gasto</Button>
        </Group>
      </Group>

      <TextInput
        mb="md"
        placeholder="Buscar por quem pagou, descrição, categoria, tipo, pagamento ou valor…"
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        leftSection={<SearchIcon />}
      />

      {sorted.length === 0 ? (
        <Empty>
          {search
            ? `Nenhum gasto encontrado para "${search}".`
            : 'Nenhum gasto neste filtro.'}
        </Empty>
      ) : (
        <Table.ScrollContainer minWidth={980}>
          <Table
            highlightOnHover verticalSpacing="sm" withRowBorders={false}
            styles={{ td: { height: 64, verticalAlign: 'middle' } }}
          >
            <Table.Thead>
              <Table.Tr>
                <SortTh label="Data" sortKey="date" sort={sort} onSort={cycleSort} />
                <SortTh label="Quem pagou" sortKey="owner" sort={sort} onSort={cycleSort} />
                <SortTh label="Descrição" sortKey="description" sort={sort} onSort={cycleSort} />
                <SortTh label="Categoria" sortKey="category" sort={sort} onSort={cycleSort} />
                <SortTh label="Tipo" sortKey="expenseType" sort={sort} onSort={cycleSort} />
                <SortTh label="Pagamento" sortKey="paymentMethod" sort={sort} onSort={cycleSort} />
                <Table.Th><Text fz={16} fw={600}>Divisão</Text></Table.Th>
                <SortTh label="Valor" sortKey="amount" sort={sort} onSort={cycleSort} align="right" />
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sorted.map((e, i) => {
                const owner = memberOf(e.userId);
                const isFirst = i === 0;
                const isLast = i === sorted.length - 1;
                // border-radius on <tr>/<td> is ignored by most browsers' table rendering,
                // so only the table's four actual corners (first/last cell of the first/last
                // row) get rounded — everything else stays square, like a single card.
                const rowBg = e.complete
                  ? 'var(--mantine-color-petrol-1)'
                  : 'var(--mantine-color-brick-1)';
                const firstCell = {
                  backgroundColor: rowBg,
                  ...(isFirst ? { borderTopLeftRadius: 8 } : {}),
                  ...(isLast ? { borderBottomLeftRadius: 8 } : {}),
                };
                const lastCell = {
                  backgroundColor: rowBg,
                  ...(isFirst ? { borderTopRightRadius: 8 } : {}),
                  ...(isLast ? { borderBottomRightRadius: 8 } : {}),
                };
                const midCell = { backgroundColor: rowBg };
                const canEdit = e.userId === user?.id;
                return (
                  <Table.Tr key={e.id}>
                    <Table.Td className="num" style={firstCell}>
                      <EditableDate value={e.date} canEdit={canEdit} onSave={(v) => patchField(e, { date: v })} />
                    </Table.Td>
                    <Table.Td style={midCell}>
                      <Group gap={7} wrap="nowrap">
                        {owner && <Avatar user={owner} />}
                        <Text size="md">{owner ? firstName(owner.name) : '—'}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td style={midCell}>
                      <EditableText
                        value={e.description}
                        placeholder="Sem descrição"
                        canEdit={canEdit}
                        onSave={(v) => patchField(e, { description: v })}
                      />
                    </Table.Td>
                    <Table.Td style={midCell}>
                      <EditableBadge
                        value={e.category}
                        options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
                        canEdit={canEdit}
                        onSave={(v) => patchField(e, { category: v as CategoryId | null })}
                        render={(v, clickable) => <CategoryChip id={v} clickable={clickable} />}
                      />
                    </Table.Td>
                    <Table.Td style={midCell}>
                      <EditableBadge
                        value={e.expenseType}
                        options={[
                          { value: 'fixed', label: 'Gasto fixo' },
                          { value: 'optional', label: 'Gasto opcional' },
                          { value: 'oneOff', label: 'Despesa pontual' },
                        ]}
                        canEdit={canEdit}
                        onSave={(v) => patchField(e, { expenseType: v as ExpenseType | null })}
                        render={(v, clickable) => <ExpenseTypeChip type={v as 'fixed' | 'optional' | 'oneOff'} clickable={clickable} />}
                      />
                    </Table.Td>
                    <Table.Td style={midCell}>
                      <EditableBadge
                        value={e.paymentMethod}
                        options={PAYMENT_METHODS.map((p) => ({ value: p, label: p }))}
                        canEdit={canEdit}
                        onSave={(v) => patchField(e, { paymentMethod: v as PaymentMethod | null })}
                        render={(v, clickable) => <PaymentMethodChip method={v as PaymentMethod} clickable={clickable} />}
                      />
                    </Table.Td>
                    <Table.Td style={midCell}>
                      <DivisaoEditor
                        expense={e}
                        members={members}
                        rules={rules}
                        canEdit={canEdit}
                        onSave={(patch) => patchField(e, patch)}
                      />
                    </Table.Td>
                    <Table.Td className="num" style={midCell}>
                      <EditableAmount value={e.amount} canEdit={canEdit} onSave={(v) => patchField(e, { amount: v })} />
                    </Table.Td>
                    <Table.Td style={lastCell}>
                      {canEdit && (
                        <ActionIcon
                          variant="subtle" color="brick" size="md"
                          aria-label={`Excluir ${e.description || 'gasto'}`}
                          onClick={() => askDelete(e)}
                        >
                          <TrashIcon />
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

      <Modal opened={createOpen} onClose={createModal.close} title="Lançar gasto" size="lg" centered>
        <ExpenseForm month={month} members={members} rules={rules} onClose={createModal.close} />
      </Modal>
    </Card>
  );
}

/**
 * One transparent icon button next to the label: each click cycles this
 * column through ascending → descending → default, and the icon's two arrows
 * light up to show which state is active.
 */
function SortTh({
  label,
  sortKey,
  sort,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  sort: Sort | null;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sort?.key === sortKey ? sort.dir : null;
  const stateLabel = active === 'asc' ? ' (crescente)' : active === 'desc' ? ' (decrescente)' : '';

  return (
    <Table.Th ta={align}>
      <Group gap={2} wrap="nowrap" justify={align === 'right' ? 'flex-end' : 'flex-start'}>
        <Text fz={16} fw={600}>{label}</Text>
        <ActionIcon
          variant="transparent" color="gray" size="md"
          aria-label={`Ordenar por ${label}${stateLabel}`}
          onClick={() => onSort(sortKey)}
        >
          <SortIcon active={active} />
        </ActionIcon>
      </Group>
    </Table.Th>
  );
}

/** Two side-by-side arrows, one up one down — the active direction lights up. */
function SortIcon({ active }: { active: 'asc' | 'desc' | null }) {
  const upColor = active === 'asc' ? 'var(--mantine-color-petrol-6)' : 'var(--gf-ink-faint)';
  const downColor = active === 'desc' ? 'var(--mantine-color-petrol-6)' : 'var(--gf-ink-faint)';
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M8 18V6" stroke={upColor} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M4 10l4-4 4 4" stroke={upColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 6v12" stroke={downColor} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 14l4 4 4-4" stroke={downColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PaymentMethodChip({ method, clickable }: { method: PaymentMethod; clickable?: boolean }) {
  return (
    <Badge
      variant="light" radius="sm" tt="none" fw={600} fz="sm"
      styles={{
        root: {
          background: 'var(--gf-card)',
          color: 'var(--gf-ink)',
          border: '1.5px solid var(--mantine-color-petrol-3)',
          ...(clickable ? { cursor: 'pointer' } : {}),
        },
      }}
    >
      {method}
    </Badge>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function TrashIcon() {
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

/**
 * Mantine's own `closeOnClickOutside` proved unreliable with this many
 * Popovers mounted at once (one per row per column), so this closes on any
 * `mousedown` itself — but a naive "outside my dropdown" check would also
 * close on a click inside a *nested* floating element (the Rateio Select's
 * own dropdown), since that portals separately from this Popover's own
 * dropdown. Treating a click anywhere inside `[data-portal]` as "inside"
 * covers both this dropdown and any such nested one.
 */
function ClickPopover({
  opened,
  onClose,
  target,
  children,
  width,
}: {
  opened: boolean;
  onClose: () => void;
  target: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!opened) return;
    const handler = (event: MouseEvent) => {
      const node = event.target;
      if (!(node instanceof Node)) return;
      if (targetRef.current?.contains(node)) return;
      if (node instanceof Element && node.closest('[data-portal]')) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [opened, onClose]);

  return (
    <Popover opened={opened} position="bottom-start" withArrow shadow="md" width={width} withinPortal>
      <Popover.Target>
        <div ref={targetRef}>{target}</div>
      </Popover.Target>
      <Popover.Dropdown>{children}</Popover.Dropdown>
    </Popover>
  );
}

/**
 * Click the date to open a calendar in a floating popover — the trigger never
 * changes appearance (no layout shift), same as Divisão. Picking a day saves
 * and closes; clicking anywhere else closes without saving.
 */
function EditableDate({
  value,
  canEdit,
  onSave,
}: {
  value: string;
  canEdit: boolean;
  onSave: (v: string) => void;
}) {
  const [opened, setOpened] = useState(false);
  const display = value.split('-').reverse().join('/');

  // Belt-and-suspenders: whatever caused the picker to reopen after a save in
  // testing, a successful save always changes `value` — closing on that is a
  // safety net regardless of the root cause.
  useEffect(() => {
    setOpened(false);
  }, [value]);

  if (!canEdit) return <Text size="md">{display}</Text>;

  return (
    <ClickPopover
      opened={opened}
      onClose={() => setOpened(false)}
      target={
        <UnstyledButton onClick={() => setOpened((o) => !o)} style={{ cursor: 'pointer' }}>
          <Text size="md">{display}</Text>
        </UnstyledButton>
      }
    >
      <DatePicker
        p={4}
        value={new Date(`${value}T12:00:00`)}
        onChange={(d) => {
          setOpened(false);
          if (!d) return;
          onSave(iso(typeof d === 'string' ? new Date(`${d}T12:00:00`) : d));
        }}
      />
    </ClickPopover>
  );
}

/**
 * Click the description to rewrite it in place — same look as the plain text
 * (no border, no padding), just becomes editable. Saves on Enter or blur.
 */
function EditableText({
  value,
  placeholder,
  canEdit,
  onSave,
}: {
  value: string;
  placeholder: string;
  canEdit: boolean;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!canEdit) {
    return value ? <Text size="md">{value}</Text> : <Text size="md" c="dimmed">{placeholder}</Text>;
  }

  if (editing) {
    const commit = () => {
      setEditing(false);
      if (draft.trim() !== value) onSave(draft.trim());
    };
    return (
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        style={inlineInputStyle}
      />
    );
  }

  return (
    <UnstyledButton onClick={() => { setDraft(value); setEditing(true); }} style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}>
      {value ? <Text size="md">{value}</Text> : <Text size="md" c="dimmed">{placeholder}</Text>}
    </UnstyledButton>
  );
}

/** Same click-to-rewrite text field as description, parsing the typed amount as a decimal (comma or dot). */
function EditableAmount({
  value,
  canEdit,
  onSave,
}: {
  value: number;
  canEdit: boolean;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value || ''));

  if (!canEdit) {
    return value > 0 ? (
      <Text size="md" fw={600} span>{brl(value)}</Text>
    ) : (
      <Text size="md" c="dimmed" span>—</Text>
    );
  }

  if (editing) {
    const commit = () => {
      setEditing(false);
      const parsed = Number(draft.trim().replace(',', '.'));
      if (Number.isFinite(parsed) && parsed !== value) onSave(parsed);
    };
    return (
      <input
        autoFocus
        inputMode="decimal"
        value={draft}
        placeholder="0,00"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(String(value || ''));
            setEditing(false);
          }
        }}
        style={{ ...inlineInputStyle, textAlign: 'right', fontWeight: 600 }}
      />
    );
  }

  return (
    <UnstyledButton
      onClick={() => { setDraft(String(value || '')); setEditing(true); }}
      style={{ width: '100%', textAlign: 'right', cursor: 'pointer' }}
    >
      {value > 0 ? (
        <Text size="md" fw={600} span>{brl(value)}</Text>
      ) : (
        <Text size="md" c="dimmed" span>—</Text>
      )}
    </UnstyledButton>
  );
}

/**
 * Click the badge (or the dash) to open a small options popover — the badge
 * itself never changes appearance, only one click needed, same as Divisão.
 */
function EditableBadge({
  value,
  options,
  canEdit,
  onSave,
  render,
}: {
  value: string | null;
  options: { value: string; label: string }[];
  canEdit: boolean;
  onSave: (v: string | null) => void;
  render: (v: string, clickable?: boolean) => ReactNode;
}) {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    setOpened(false);
  }, [value]);

  if (!canEdit) {
    return value ? <>{render(value)}</> : <Text size="md" c="dimmed">—</Text>;
  }

  return (
    <ClickPopover
      opened={opened}
      onClose={() => setOpened(false)}
      width={150}
      target={
        <UnstyledButton onClick={() => setOpened((o) => !o)} style={{ cursor: 'pointer' }}>
          {value ? render(value, true) : <Text size="md" c="dimmed">A definir</Text>}
        </UnstyledButton>
      }
    >
      <Stack gap={2} p={4}>
        {options.map((o) => (
          <UnstyledButton
            key={o.value}
            onClick={() => { setOpened(false); onSave(o.value); }}
            px="xs" py={6}
            style={{
              borderRadius: 6,
              cursor: 'pointer',
              background: o.value === value ? 'var(--mantine-color-petrol-0)' : undefined,
            }}
          >
            <Text size="sm">{o.label}</Text>
          </UnstyledButton>
        ))}
        {value && (
          <UnstyledButton onClick={() => { setOpened(false); onSave(null); }} px="xs" py={6} style={{ borderRadius: 6, cursor: 'pointer' }}>
            <Text size="sm" c="dimmed">Limpar</Text>
          </UnstyledButton>
        )}
      </Stack>
    </ClickPopover>
  );
}

/**
 * Divisão bundles three related fields (dividir, com quem, rateio), so a
 * single click-to-edit control doesn't fit — a popover holds the same
 * sub-form the create modal uses, saving each toggle/selection right away.
 */
function DivisaoEditor({
  expense,
  members,
  rules,
  canEdit,
  onSave,
}: {
  expense: ExpenseDTO;
  members: MemberDTO[];
  rules: RuleDTO[];
  canEdit: boolean;
  onSave: (patch: { shared: boolean; participants: string[]; ruleId: string | null }) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [shared, setShared] = useState(expense.shared);
  const [participants, setParticipants] = useState<string[]>(expense.participants);
  const [ruleId, setRuleId] = useState<string | null>(expense.ruleId);

  const view = !expense.shared ? (
    <Text size="md" c="dimmed">só de quem pagou</Text>
  ) : !expense.ruleId || expense.participants.length === 0 ? (
    <Text size="md" c="dimmed">a definir</Text>
  ) : (
    <Stack gap={2}>
      <Text size="md" fw={500}>{rules.find((r) => r.id === expense.ruleId)?.name ?? '—'}</Text>
      <Text size="md" c="dimmed">
        {expense.participants.map((p) => {
          const name = members.find((m) => m.id === p)?.name;
          return name ? firstName(name) : '—';
        }).join(', ')}
      </Text>
    </Stack>
  );

  if (!canEdit) return view;

  const open = () => {
    setShared(expense.shared);
    setParticipants(expense.participants);
    setRuleId(expense.ruleId);
    setOpened(true);
  };

  // Draft-and-save instead of saving on every toggle: three related fields
  // changing one PATCH at a time meant three requests for one edit.
  const save = () => {
    setOpened(false);
    onSave({ shared, participants, ruleId });
  };

  const rule = rules.find((r) => r.id === ruleId);

  return (
    <ClickPopover
      opened={opened}
      onClose={() => setOpened(false)}
      width={280}
      target={
        <UnstyledButton onClick={() => (opened ? setOpened(false) : open())} style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}>
          {view}
        </UnstyledButton>
      }
    >
      <Stack gap="sm" p="sm">
        <Checkbox
          label="Dividir com outras pessoas"
          checked={shared}
          onChange={(ev) => setShared(ev.currentTarget.checked)}
        />
        {shared && (
          <>
            <Chip.Group multiple value={participants} onChange={setParticipants}>
              <Group gap="xs">
                {members.map((m) => (
                  <Chip key={m.id} value={m.id} size="xs" color="petrol" variant="outline">{m.name}</Chip>
                ))}
              </Group>
            </Chip.Group>
            <Select
              placeholder="Rateio" clearable
              description={rule?.description}
              data={rules.map((r) => ({ value: r.id, label: r.name }))}
              value={ruleId}
              onChange={setRuleId}
            />
          </>
        )}
        <Group justify="flex-end" gap="xs" mt={4}>
          <Button variant="default" size="xs" onClick={() => setOpened(false)}>Cancelar</Button>
          <Button size="xs" onClick={save}>Salvar</Button>
        </Group>
      </Stack>
    </ClickPopover>
  );
}

/**
 * Quick-add form for the "Lançar gasto" modal. Every field but the date is
 * optional — an expense can be saved incomplete and finished later inline,
 * right there in the table.
 */
function ExpenseForm({
  month,
  members,
  rules,
  onClose,
}: {
  month: string;
  members: MemberDTO[];
  rules: RuleDTO[];
  onClose: () => void;
}) {
  const { user } = useAuth();

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      date: new Date(`${month}-15T12:00:00`),
      paymentMethod: null as PaymentMethod | null,
      category: null as CategoryId | null,
      expenseType: null as ExpenseType | null,
      description: '',
      amount: '' as string | number,
      shared: false,
      participants: user ? [user.id] : [],
      ruleId: rules[0]?.id ?? '',
    },
    validate: {
      amount: (v) => (v === '' || v == null || Number(v) > 0 ? null : 'O valor precisa ser maior que zero.'),
    },
  });

  const save = useAppMutation(
    (body: Record<string, unknown>) => api.post<ExpenseDTO>('/gastos', body),
    [keys.expenses(month), keys.statement(month)],
    {
      onSuccess: () => {
        notifySuccess('Gasto lançado.');
        onClose();
      },
      onError: (e) => notifyError(e.message),
    },
  );

  const shared = form.getValues().shared;
  const chosenRule = rules.find((r) => r.id === form.getValues().ruleId);

  const submit = form.onSubmit((v) =>
    save.mutate({
      date: iso(v.date),
      paymentMethod: v.paymentMethod || undefined,
      category: v.category || undefined,
      expenseType: v.expenseType || undefined,
      description: v.description.trim(),
      amount: v.amount === '' || v.amount == null ? undefined : Number(v.amount),
      shared: v.shared,
      participants: v.shared ? v.participants : [],
      ruleId: v.shared ? v.ruleId || undefined : undefined,
    }),
  );

  return (
    <form onSubmit={submit}>
      <Grid gap="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <DatePickerInput
            label="Data" valueFormat="DD/MM/YYYY"
            key={form.key('date')} {...form.getInputProps('date')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Select
            label="Pagamento" placeholder="A definir" clearable
            data={[...PAYMENT_METHODS]}
            key={form.key('paymentMethod')} {...form.getInputProps('paymentMethod')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Select
            label="Categoria" placeholder="A definir" clearable
            data={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
            key={form.key('category')} {...form.getInputProps('category')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Select
            label="Tipo" placeholder="A definir" clearable
            data={[
              { value: 'fixed', label: 'Gasto fixo' },
              { value: 'optional', label: 'Gasto opcional' },
              { value: 'oneOff', label: 'Despesa pontual' },
            ]}
            key={form.key('expenseType')} {...form.getInputProps('expenseType')}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <TextInput
            label="Descrição" placeholder="Aluguel, mercado, cinema…"
            key={form.key('description')} {...form.getInputProps('description')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <NumberInput
            label="Valor" prefix="R$ " decimalScale={2} decimalSeparator="," thousandSeparator="."
            min={0} placeholder="0,00" key={form.key('amount')} {...form.getInputProps('amount')}
          />
        </Grid.Col>

        <Grid.Col span={12}>
          <Checkbox
            label="Dividir com outras pessoas"
            key={form.key('shared')} {...form.getInputProps('shared', { type: 'checkbox' })}
          />
        </Grid.Col>

        {shared && (
          <>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" fw={500} c="dimmed" mb={5}>Com quem</Text>
              <Chip.Group multiple key={form.key('participants')} {...form.getInputProps('participants')}>
                <Group gap="xs">
                  {members.map((m) => (
                    <Chip key={m.id} value={m.id} color="petrol" variant="outline">{m.name}</Chip>
                  ))}
                </Group>
              </Chip.Group>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Rateio" placeholder="A definir" clearable
                description={chosenRule?.description}
                data={rules.map((r) => ({ value: r.id, label: r.name }))}
                key={form.key('ruleId')} {...form.getInputProps('ruleId')}
              />
            </Grid.Col>
          </>
        )}
      </Grid>

      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={save.isPending}>Adicionar gasto</Button>
      </Group>
    </form>
  );
}
