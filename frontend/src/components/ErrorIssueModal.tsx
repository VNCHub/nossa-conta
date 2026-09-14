import { useState } from 'react';
import { Badge, Group, Modal, Pagination, ScrollArea, Stack, Text } from '@mantine/core';
import type { ErrorEventDTO } from '@shared/contracts';
import { useErrorIssueDetail } from '../api/hooks';
import { Loading, Empty } from './ui';

const PAGE_SIZE = 20;

export function ErrorIssueModal({ issueId, onClose }: { issueId: string; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = useErrorIssueDetail(issueId, page, PAGE_SIZE);

  const events = detail.data?.events.items ?? [];
  const selected: ErrorEventDTO | undefined = events.find((e) => e.id === selectedId) ?? events[0];

  return (
    <Modal
      opened
      onClose={onClose}
      title={detail.data ? detail.data.issue.title : 'Carregando…'}
      size="70rem"
      centered
    >
      {!detail.data ? (
        detail.error ? <Empty>{detail.error.message}</Empty> : <Loading />
      ) : (
        <Group align="flex-start" gap="lg" wrap="nowrap">
          <Stack gap="xs" w={240} style={{ flexShrink: 0 }}>
            <Group gap={6}>
              <Badge
                color={detail.data.issue.source === 'backend' ? 'grape' : 'petrol'}
                variant="light" tt="none"
              >
                {detail.data.issue.source === 'backend' ? 'Backend' : 'Frontend'}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {detail.data.issue.eventsCount} ocorrência(s) — desde{' '}
              {new Date(detail.data.issue.firstSeenAt).toLocaleDateString('pt-BR')}
            </Text>

            {events.length === 0 ? (
              <Empty>Nenhuma ocorrência.</Empty>
            ) : (
              <ScrollArea.Autosize mah={380}>
                <Stack gap={2}>
                  {events.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedId(e.id)}
                      style={{
                        textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none',
                        cursor: 'pointer', font: 'inherit',
                        background: selected?.id === e.id ? 'var(--gf-card)' : 'transparent',
                      }}
                    >
                      <Text size="sm">{new Date(e.occurredAt).toLocaleString('pt-BR')}</Text>
                    </button>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            )}

            {detail.data.events.total > PAGE_SIZE && (
              <Pagination
                size="xs" value={page} onChange={setPage}
                total={Math.ceil(detail.data.events.total / PAGE_SIZE)}
              />
            )}
          </Stack>

          <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
            {selected ? (
              <>
                <Text fw={600}>{selected.title}</Text>
                <Text size="sm" c="dimmed">
                  {new Date(selected.occurredAt).toLocaleString('pt-BR')}
                </Text>
                <ScrollArea.Autosize mah={420}>
                  <Text
                    component="pre" size="xs"
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}
                  >
                    {selected.stack}
                  </Text>
                </ScrollArea.Autosize>
              </>
            ) : (
              <Empty>Selecione uma ocorrência.</Empty>
            )}
          </Stack>
        </Group>
      )}
    </Modal>
  );
}
