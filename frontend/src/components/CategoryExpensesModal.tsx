import { Fragment } from 'react';
import { Divider, Group, Modal, ScrollArea, Stack, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { CATEGORIES, type CategoryId } from '@shared/domain';
import type { MemberDTO, RuleDTO, StatementLine } from '@shared/contracts';
import { brl } from '@shared/format';
import { Avatar, Empty } from './ui';

// Same convention as EditableDate in ExpensesLedger: expense dates are
// YYYY-MM-DD, parsed with `new Date` they can shift a day under a
// non-UTC timezone, so split-and-reverse avoids Date entirely.
const dateLabel = (iso: string) => iso.split('-').reverse().join('/');

export function CategoryExpensesModal({
  categoryId,
  lines,
  userId,
  members,
  rules,
  onClose,
}: {
  categoryId: CategoryId;
  lines: StatementLine[];
  userId: string;
  members: MemberDTO[];
  rules: RuleDTO[];
  onClose: () => void;
}) {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const memberOf = (id: string) => members.find((m) => m.id === id);
  const ruleOf = (id: string | null) => (id ? rules.find((r) => r.id === id) : undefined);
  // Same breakpoint used by the other list modals (ExpensesLedger, ExpensesImports):
  // a centered dialog wastes too much of a phone's width, a full-screen sheet doesn't.
  const isMobile = useMediaQuery('(max-width: 48em)');

  const items = lines
    .filter((l) => l.category === categoryId && (l.shares[userId] ?? 0) > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  const myTotal = items.reduce((sum, l) => sum + l.amount * (l.shares[userId] ?? 0), 0);

  return (
    <Modal
      opened
      onClose={onClose}
      // Two lines instead of "Categoria · sua cota: R$ x": one long string next to
      // the close button wraps unpredictably on a narrow header.
      title={
        category ? (
          <div>
            <Text fw={700}>{category.name}</Text>
            <Text size="sm" c="dimmed">sua cota: {brl(myTotal)}</Text>
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
        <Empty>Nenhum gasto rateado para você nesta categoria.</Empty>
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
                      <Text className="num" fw={600} style={{ flexShrink: 0 }}>{brl(l.amount)}</Text>
                    </Group>

                    <Stack gap={4} mt="xs">
                      <Text size="xs" c="dimmed">
                        Rateio: {rule ? rule.name : 'Divisão igual'}
                      </Text>
                      {participants.map(([pid, frac]) => {
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
                              {brl(l.amount * frac)}
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
