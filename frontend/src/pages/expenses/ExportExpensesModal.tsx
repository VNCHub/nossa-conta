import { useState } from 'react';
import { Button, Group, Modal, SegmentedControl, SimpleGrid, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import type { ExpensesExportDTO } from '@shared/contracts';
import { ApiError, api } from '../../api/client';
import { notifyError, notifySuccess } from '../../feedback';
import { reportError } from '../../observability';
import { iso } from './date';

type Scope = 'meus' | 'todos';

/** DatePickerInput's onChange can hand back a plain "YYYY-MM-DD" string instead of a Date (see EditableDate in ExpensesLedger.tsx) — never trust it's already a Date. */
const toDate = (v: unknown): Date | null =>
  v == null ? null : typeof v === 'string' ? new Date(`${v}T12:00:00`) : (v as Date);

/** Downloads straight from the browser — the export never touches a server-side temp file. */
function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportExpensesModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [scope, setScope] = useState<Scope>('meus');
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (start && end && start > end) {
      notifyError('A data inicial não pode ser depois da data final.');
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ escopo: scope });
      if (start) params.set('inicio', iso(start));
      if (end) params.set('fim', iso(end));
      const data = await api.get<ExpensesExportDTO>(`/gastos/exportar?${params}`);
      downloadJson(data, `gastos-nossa-conta-${iso(new Date())}.json`);
      notifySuccess(
        `${data.expenses.length} gasto${data.expenses.length === 1 ? '' : 's'} exportado${data.expenses.length === 1 ? '' : 's'}.`,
      );
      onClose();
    } catch (e) {
      // ApiError is an expected, user-facing failure (validation, network) — anything
      // else is a real bug, and this catch would otherwise hide it from observability
      // (window.onerror/unhandledrejection never see an error caught in here).
      if (!(e instanceof ApiError)) {
        reportError(e instanceof Error ? e.message : String(e), e instanceof Error ? e.stack ?? '' : String(e));
      }
      notifyError(e instanceof Error ? e.message : 'Não foi possível exportar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Exportar dados" size="md" centered fullScreen={isMobile}>
      <Stack gap="md">
        <div>
          <Text size="sm" fw={500} c="dimmed" mb={6}>Gastos</Text>
          <SegmentedControl
            fullWidth
            size="md"
            value={scope}
            onChange={(v) => setScope(v as Scope)}
            data={[
              { value: 'meus', label: 'Meus' },
              { value: 'todos', label: 'Todos' },
            ]}
          />
        </div>

        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <DatePickerInput
            dropdownType={isMobile ? 'modal' : 'popover'} styles={{ input: { fontSize: 16 } }}
            label="Data inicial" placeholder="Desde o início" valueFormat="DD/MM/YYYY"
            clearable value={start} onChange={(v) => setStart(toDate(v))}
          />
          <DatePickerInput
            dropdownType={isMobile ? 'modal' : 'popover'} styles={{ input: { fontSize: 16 } }}
            label="Data final" placeholder="Até hoje" valueFormat="DD/MM/YYYY"
            clearable value={end} onChange={(v) => setEnd(toDate(v))}
          />
        </SimpleGrid>

        <Text size="xs" c="dimmed">
          Gera um arquivo .json com os gastos no período escolhido — para reimportar depois em outro ambiente, use a opção "Interno" na aba Importações.
        </Text>

        <Group justify="flex-end" grow={isMobile ?? false} mt="md">
          <Button h={isMobile ? 44 : undefined} variant="default" onClick={onClose}>Cancelar</Button>
          <Button h={isMobile ? 44 : undefined} onClick={submit} loading={loading}>Exportar</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
