import { Fragment } from 'react';
import { Divider, Group, Modal, ScrollArea, Stack, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { CATEGORIES, type CategoryId } from '@shared/domain';
import type { SpendingType } from './Donut';
import type { MemberDTO, RuleDTO, StatementLine } from '@shared/contracts';
import { Avatar, Empty, Money } from './ui';

// Same convention as EditableDate in ExpensesLedger: expense dates are
// YYYY-MM-DD, parsed with `new Date` they can shift a day under a
// non-UTC timezone, so split-and-reverse avoids Date entirely.
const TYPE_TITLES: Record<SpendingType, string> = { fixed: 'Gastos fixos', oneOff: 'Gastos pontuais' };

const dateLabel = (iso: string) => iso.split('-').reverse().join('/');

export function CategoryExpensesModal({
  filter,
  lines,
  userId,
  members,
  rules,
  onClose,
}: {
  filter: { category: CategoryId } | { type: SpendingType };
  lines: StatementLine[];
  userId: string;
  members: MemberDTO[];
  rules: RuleDTO[];
  onClose: () => void;
}) {
  const category = 'category' in filter ? CATEGORIES.find((c) => c.id === filter.category) : undefined;
  const heading = 'type' in filter ? TYPE_TITLES[filter.type] : category?.name;
  const memberOf = (id: string) => members.find((m) => m.id === id);
  const ruleOf = (id: string | null) => (id ? rules.find((r) => r.id === id) : undefined);
  // Same breakpoint used by the other list modals (ExpensesLedger, ExpensesImports):
  // a centered dialog wastes too much of a phone's width, a full-screen sheet doesn't.
  const isMobile = useMediaQuery('(max-width: 48em)');

  // The statement counts everything that is not 'fixed' as one-off, so the
  // modal does the same — otherwise its total would not match the card.
  const matches = (l: StatementLine) =>
    'category' in filter
      ? l.category === filter.category
      : (l.expenseType === 'fixed') === (filter.type === 'fixed');

  const items = lines
    .filter((l) => matches(l) && (l.shares[userId] ?? 0) > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Sum integer cents, not amount * fraction: the card next to this modal is built
  // from the same cents, so any float rounding here would show up as a stray cent.
  const myTotal = items.reduce((sum, l) => sum + (l.shareCents[userId] ?? 0), 0) / 100;

  return (
    <Modal
      opened
      onClose={onClose}
      // Two lines instead of "Categoria · sua cota: R$ x": one long string next to
      // the close button wraps unpredictably on a narrow header.
      title={
        heading ? (
          <div>
            <Text fw={700}>{heading}</Text>
            <Text size="sm" c="dimmed">sua cota: <Money value={myTotal} /></Text>
          </div>
        ) : (
          'Gastos da categoria'
        )
      }
      size="lg"
      centered
      fullScreen={isMobile}
      // Default close button is 28px; 44px is the minimum comfortable thumb target.
      closeButtonProps={{ size: isMobile ? 44 : 'md', 'aria-label': 'Fechar' }}
    >
      {items.length === 0 ? (
        <Empty>Nenhum gasto rateado para você {'type' in filter ? 'neste tipo' : 'nesta categoria'}.</Empty>
      ) : (
        // Full height on mobile (fullScreen) instead of a fixed 480px box, so a long
        // list uses the screen it already has instead of scrolling in a small window.
        <ScrollArea.Autosize mah={isMobile ? 'calc(100dvh - 140px)' : 480}>
          <Stack gap="md">
            {items.map((l, i) => {
              const owner = memberOf(l.userId);
              const rule = ruleOf(l.ruleId);
              const participants = Object.entries(l.shares)
                .filter(([, frac]) => frac > 0)
                .sort(([, a], [, b]) => b - a);

              return (
                <Fragment key={l.id}>
                  <div>
                    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                      {/* minWidth: 0 lets the description wrap instead of pushing the
                          amount past the modal edge — flex items don't shrink below
                          their content width by default. */}
                      <div style={{ minWidth: 0 }}>
                        <Text fw={600}>{l.description || 'Sem descrição'}</Text>
                        <Text size="sm" c="dimmed">
                          {dateLabel(l.date)} · pago por {owner ? owner.name : '—'}
                        </Text>
                      </div>
                      <Text className="num" fw={600} style={{ flexShrink: 0 }}><Money value={l.amount} /></Text>
                    </Group>

                    <Stack gap={4} mt="xs">
                      <Text size="xs" c="dimmed">
                        Rateio: {rule ? rule.name : 'Divisão igual'}
                      </Text>
                      {participants.map(([pid]) => {
                        const m = memberOf(pid);
                        const isMe = pid === userId;
                        return (
                          <Group key={pid} justify="space-between" wrap="nowrap" gap="sm">
                            <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                              {m && <Avatar user={m} />}
                              <Text size="sm" fw={isMe ? 700 : 400} truncate>
                                {m ? m.name : '—'}{isMe ? ' (você)' : ''}
                              </Text>
                            </Group>
                            <Text className="num" size="sm" c={isMe ? undefined : 'dimmed'} style={{ flexShrink: 0 }}>
                              <Money value={(l.shareCents[pid] ?? 0) / 100} />
                            </Text>
                          </Group>
                        );
                      })}
                    </Stack>
                  </div>
                  {i < items.length - 1 && <Divider />}
                </Fragment>
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      )}
    </Modal>
  );
}
