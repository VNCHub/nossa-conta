import { Fragment } from 'react';
import { Divider, Group, Modal, ScrollArea, Stack, Text } from '@mantine/core';
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

  const items = lines
    .filter((l) => l.category === categoryId && (l.shares[userId] ?? 0) > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  const myTotal = items.reduce((sum, l) => sum + l.amount * (l.shares[userId] ?? 0), 0);

  return (
    <Modal
      opened
      onClose={onClose}
      title={category ? `${category.name} · sua cota: ${brl(myTotal)}` : 'Gastos da categoria'}
      size="lg"
      centered
    >
      {items.length === 0 ? (
        <Empty>Nenhum gasto rateado para você nesta categoria.</Empty>
      ) : (
        <ScrollArea.Autosize mah={480}>
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
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <div>
                        <Text fw={600}>{l.description || 'Sem descrição'}</Text>
                        <Text size="sm" c="dimmed">
                          {dateLabel(l.date)} · pago por {owner ? owner.name : '—'}
                        </Text>
                      </div>
                      <Text className="num" fw={600}>{brl(l.amount)}</Text>
                    </Group>

                    <Stack gap={4} mt="xs">
                      <Text size="xs" c="dimmed">
                        Rateio: {rule ? rule.name : 'Divisão igual'}
                      </Text>
                      {participants.map(([pid, frac]) => {
                        const m = memberOf(pid);
                        const isMe = pid === userId;
                        return (
                          <Group key={pid} justify="space-between" wrap="nowrap">
                            <Group gap={6} wrap="nowrap">
                              {m && <Avatar user={m} />}
                              <Text size="sm" fw={isMe ? 700 : 400}>
                                {m ? m.name : '—'}{isMe ? ' (você)' : ''}
                              </Text>
                            </Group>
                            <Text className="num" size="sm" c={isMe ? undefined : 'dimmed'}>
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
