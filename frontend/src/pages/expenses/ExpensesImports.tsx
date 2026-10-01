import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import type { ImportedFileDTO, ImportResultDTO } from '@shared/contracts';
import {
  BANK_PROVIDERS,
  IMPORT_DOCUMENT_TYPE_LABELS,
  INTERNAL_SOURCE_ID,
  type ImportSourceId,
} from '@shared/domain';
import { api } from '../../api/client';
import { keys, useAppMutation, useImports, useMembers } from '../../api/hooks';
import { useAuth } from '../../auth/AuthContext';
import { Empty, Loading } from '../../components/ui';
import { notifyError, notifySuccess } from '../../feedback';

/** Bank files are sniffed by content; the internal export is a fixed .json shape, so its extension is all that's checked. */
const acceptedExtensionsFor = (source: ImportSourceId) =>
  source === INTERNAL_SOURCE_ID ? ['.json'] : ['.csv', '.ofx'];

type Filter = 'all' | 'mine';

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'mine', label: 'Meus' },
];

export default function ExpensesImports() {
  const imports = useImports();
  const { user } = useAuth();
  const { data: members } = useMembers();
  const [filter, setFilter] = useState<Filter>('mine');
  const [modalOpen, modal] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 48em)');
  // The server refuses the internal import for anyone else; this only keeps the UI from offering it.
  const isAdmin = user?.roles.includes('admin') ?? false;

  if (!imports.data) {
    return imports.error ? <Empty>{imports.error.message}</Empty> : <Loading />;
  }

  const visible = imports.data.filter((f) => filter === 'all' || f.importedBy === user?.id);
  // Only "Todos" mixes people's files, so only there is it worth saying whose each one is.
  const importerOf = (f: ImportedFileDTO) => {
    if (filter !== 'all') return undefined;
    return members?.find((m) => m.id === f.importedBy)?.name ?? '—';
  };

  return (
    <Card>
      <Stack hiddenFrom="sm" gap="sm" mb="md">
        <Title order={3} fz={20}>Importações</Title>
        <SegmentedControl
          fullWidth
          size="md"
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          data={FILTER_OPTIONS}
        />
        <Button size="md" onClick={modal.open}>Nova importação</Button>
      </Stack>

      <Group justify="space-between" mb="md" wrap="wrap" visibleFrom="sm">
        <Title order={3} fz={20}>Importações</Title>
        <Group gap="sm" wrap="wrap">
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            data={FILTER_OPTIONS}
          />
          <Button onClick={modal.open}>Nova importação</Button>
        </Group>
      </Group>

      {visible.length === 0 ? (
        <Empty>{filter === 'mine' ? 'Você ainda não importou nenhum arquivo.' : 'Nenhum arquivo importado ainda.'}</Empty>
      ) : (
        <>
          <Table.ScrollContainer minWidth={860} visibleFrom="sm">
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th><Text fz={16} fw={600}>Arquivo</Text></Table.Th>
                  <Table.Th><Text fz={16} fw={600}>Banco</Text></Table.Th>
                  <Table.Th><Text fz={16} fw={600}>Tipo</Text></Table.Th>
                  <Table.Th><Text fz={16} fw={600}>Período</Text></Table.Th>
                  <Table.Th ta="right"><Text fz={16} fw={600}>Gastos</Text></Table.Th>
                  <Table.Th ta="right"><Text fz={16} fw={600}>Entradas</Text></Table.Th>
                  {filter === 'all' && <Table.Th><Text fz={16} fw={600}>Importado por</Text></Table.Th>}
                  <Table.Th><Text fz={16} fw={600}>Importado em</Text></Table.Th>
                  <Table.Th><Text fz={16} fw={600}>Retenção</Text></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visible.map((f) => (
                  <ImportRow key={f.id} file={f} importer={importerOf(f)} />
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          <Stack hiddenFrom="sm" gap="sm">
            {visible.map((f) => (
              <MobileImportCard key={f.id} file={f} importer={importerOf(f)} />
            ))}
          </Stack>
        </>
      )}

      <Modal
        opened={modalOpen}
        onClose={modal.close}
        title="Nova importação"
        size="lg"
        centered
        closeOnClickOutside={false}
        fullScreen={isMobile}
      >
        <ImportWizard onClose={modal.close} allowInternal={isAdmin} />
      </Modal>
    </Card>
  );
}

/** Mobile replacement for one table row of the imports history — same data, stacked. */
function MobileImportCard({ file, importer }: { file: ImportedFileDTO; importer?: string }) {
  const bank = BANK_PROVIDERS.find((b) => b.id === file.bank);
  const expired = new Date(file.expiresAt).getTime() <= Date.now();

  return (
    <Card p="sm" radius="md" withBorder>
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb={6}>
        <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          <Text size="md">{file.originalName}</Text>
          <Text size="xs" c="dimmed" tt="uppercase">{file.fileFormat}</Text>
        </div>
        <Group gap={7} wrap="nowrap" style={{ flexShrink: 0 }}>
          {file.bank === INTERNAL_SOURCE_ID ? <InternalLogo size={22} /> : <BankLogo size={22} />}
          <Text size="md">{file.bank === INTERNAL_SOURCE_ID ? 'Nossa Conta' : bank?.name ?? file.bank}</Text>
        </Group>
      </Group>

      <Text size="md" mb={2}>{IMPORT_DOCUMENT_TYPE_LABELS[file.documentType]}</Text>
      <Text size="sm" c="dimmed" className="num" mb={8}>{brDate(file.periodStart)} – {brDate(file.periodEnd)}</Text>

      <Group justify="space-between" wrap="wrap" mb={8}>
        <Text size="md" fw={600} className="num">{file.expensesCount} gasto{file.expensesCount === 1 ? '' : 's'}</Text>
        <Text size="md" fw={600} className="num">{file.incomesCount} entrada{file.incomesCount === 1 ? '' : 's'}</Text>
      </Group>

      <Text size="sm" c="dimmed">
        Importado em {brDateTime(file.createdAt)}{importer !== undefined && ` por ${importer}`}
      </Text>
      <Text size="sm" c="dimmed">
        {expired ? 'Excluído' : `Disponível até ${brDate(file.expiresAt)}`}
      </Text>
    </Card>
  );
}

/** `importer` is set only in the "Todos" view, which is the one that shows the "Importado por" column. */
function ImportRow({ file, importer }: { file: ImportedFileDTO; importer?: string }) {
  const bank = BANK_PROVIDERS.find((b) => b.id === file.bank);
  const expired = new Date(file.expiresAt).getTime() <= Date.now();

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="md">{file.originalName}</Text>
        <Text size="xs" c="dimmed" tt="uppercase">{file.fileFormat}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap={7} wrap="nowrap">
          {file.bank === INTERNAL_SOURCE_ID ? <InternalLogo size={22} /> : <BankLogo size={22} />}
          <Text size="md">{file.bank === INTERNAL_SOURCE_ID ? 'Nossa Conta' : bank?.name ?? file.bank}</Text>
        </Group>
      </Table.Td>
      <Table.Td><Text size="md">{IMPORT_DOCUMENT_TYPE_LABELS[file.documentType]}</Text></Table.Td>
      <Table.Td><Text size="sm" className="num">{brDate(file.periodStart)} – {brDate(file.periodEnd)}</Text></Table.Td>
      <Table.Td ta="right"><Text size="md" fw={600} className="num">{file.expensesCount}</Text></Table.Td>
      <Table.Td ta="right"><Text size="md" fw={600} className="num">{file.incomesCount}</Text></Table.Td>
      {importer !== undefined && <Table.Td><Text size="md">{importer}</Text></Table.Td>}
      <Table.Td><Text size="sm">{brDateTime(file.createdAt)}</Text></Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {expired ? 'Excluído' : `Disponível até ${brDate(file.expiresAt)}`}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

type WizardStep = 'select' | 'loading';

/**
 * Origem (banco ou o "Interno" da própria Nossa Conta, admin only) + files, then a
 * loading state while the backend validates and processes each file — no
 * document-type step: the backend sniffs whether a bank file is an account
 * statement or an invoice, CSV or OFX, from its content; the internal export
 * always has the same shape.
 */
function ImportWizard({ onClose, allowInternal }: { onClose: () => void; allowInternal: boolean }) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [step, setStep] = useState<WizardStep>('select');
  const [bank, setBank] = useState<ImportSourceId>(BANK_PROVIDERS[0].id);
  const [files, setFiles] = useState<File[]>([]);
  const extensions = acceptedExtensionsFor(bank);
  const isInternal = bank === INTERNAL_SOURCE_ID;

  const importMutation = useAppMutation(
    (formData: FormData) => api.upload<ImportResultDTO[]>('/gastos/importacoes', formData),
    // Prefix keys — an import can create records in months other than the one
    // currently open, so every cached `expenses`/`statement` query is invalidated.
    [keys.imports, keys.incomes, ['expenses'], ['statement']],
    {
      onSuccess: (results) => {
        report(results);
        onClose();
      },
      onError: (e) => {
        setStep('select');
        notifyError(e.message);
      },
    },
  );

  const addFiles = (accepted: File[]) => {
    const valid = accepted.filter((f) =>
      extensions.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );
    if (valid.length < accepted.length) {
      notifyError(`Envie apenas arquivos ${extensions.join(' ou ')}.`);
    }
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const submit = () => {
    setStep('loading');
    const formData = new FormData();
    formData.append('bank', bank);
    files.forEach((f) => formData.append('files', f));
    importMutation.mutate(formData);
  };

  if (step === 'loading') {
    return (
      <Stack align="center" gap="md" py="xl">
        <Loader color="petrol" />
        <Text c="dimmed">Processando {files.length === 1 ? 'o arquivo' : `os ${files.length} arquivos`}…</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} c="dimmed" mb={6}>Origem</Text>
        <Group gap="sm">
          {BANK_PROVIDERS.map((b) => (
            <UnstyledButton
              key={b.id}
              onClick={() => { setBank(b.id); setFiles([]); }}
              p="sm"
              mih={44}
              style={{
                borderRadius: 8,
                border: `1.5px solid ${b.id === bank ? 'var(--mantine-color-petrol-6)' : 'var(--gf-line)'}`,
                background: b.id === bank ? 'var(--mantine-color-petrol-0)' : undefined,
              }}
            >
              <Group gap={8}>
                <BankLogo size={26} />
                <Text size="sm" fw={600}>{b.name}</Text>
              </Group>
            </UnstyledButton>
          ))}
          {allowInternal && (
            <UnstyledButton
              onClick={() => { setBank(INTERNAL_SOURCE_ID); setFiles([]); }}
              p="sm"
              mih={44}
              style={{
                borderRadius: 8,
                border: `1.5px solid ${isInternal ? 'var(--mantine-color-petrol-6)' : 'var(--gf-line)'}`,
                background: isInternal ? 'var(--mantine-color-petrol-0)' : undefined,
              }}
            >
              <Group gap={8}>
                <InternalLogo size={26} />
                <Text size="sm" fw={600}>Interno</Text>
              </Group>
            </UnstyledButton>
          )}
        </Group>
      </div>

      <div>
        <Text size="sm" fw={500} c="dimmed" mb={6}>
          {isInternal ? 'Arquivo (exportado pela Nossa Conta)' : 'Arquivos (extrato da conta ou fatura, CSV ou OFX)'}
        </Text>
        <Dropzone onDrop={addFiles} multiple={!isInternal}>
          <Stack align="center" gap={4} py="md">
            <Text size="sm">
              {isMobile
                ? `Toque para escolher ${isInternal ? 'o arquivo' : 'os arquivos'}`
                : `Arraste ${isInternal ? 'o arquivo' : 'os arquivos'} aqui ou clique para escolher`}
            </Text>
            <Text size="xs" c="dimmed">
              {isInternal
                ? 'O .json baixado em "Exportar dados"'
                : 'Aceita vários arquivos de uma vez — .csv ou .ofx'}
            </Text>
          </Stack>
        </Dropzone>
      </div>

      {files.length > 0 && (
        <Stack gap={4}>
          {files.map((f, i) => (
            <Group key={`${f.name}-${i}`} justify="space-between" wrap="nowrap">
              <Text size="sm" truncate>{f.name}</Text>
              <ActionIcon variant="subtle" color="brick" size={44} aria-label={`Remover ${f.name}`} onClick={() => removeFile(i)}>
                ×
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      )}

      <Group justify="flex-end" grow={isMobile ?? false} mt="md">
        <Button h={isMobile ? 44 : undefined} variant="default" onClick={onClose}>Cancelar</Button>
        <Button h={isMobile ? 44 : undefined} disabled={files.length === 0} onClick={submit}>Enviar importação</Button>
      </Group>
    </Stack>
  );
}

/** One toast summarizing the whole batch, plus one per failed file so the reason is visible. */
function report(results: ImportResultDTO[]) {
  const successes = results.filter((r) => r.status === 'success');
  const failures = results.filter((r) => r.status === 'error');

  if (successes.length > 0) {
    const expensesCount = successes.reduce((s, r) => s + (r.file?.expensesCount ?? 0), 0);
    const incomesCount = successes.reduce((s, r) => s + (r.file?.incomesCount ?? 0), 0);
    const duplicates = successes.reduce((s, r) => s + (r.file?.duplicateTransactionsSkipped ?? 0), 0);
    const parts = [`${expensesCount} gasto${expensesCount === 1 ? '' : 's'}`];
    if (incomesCount > 0) parts.push(`${incomesCount} entrada${incomesCount === 1 ? '' : 's'}`);
    const duplicatesNote = duplicates > 0 ? ` (${duplicates} já tinham sido importados antes)` : '';
    notifySuccess(
      `${successes.length} arquivo${successes.length === 1 ? '' : 's'} importado${successes.length === 1 ? '' : 's'}: ${parts.join(' e ')} lançados${duplicatesNote}.`,
    );
  }

  for (const f of failures) {
    notifyError(`${f.fileName}: ${f.message ?? 'não foi possível importar.'}`);
  }
}

const brDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const brDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${brDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Abstract badge, not the trademarked logo — a colored mark that identifies the bank at a glance. */
function BankLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#820AD1" />
      <text
        x="12" y="17" textAnchor="middle"
        fontSize="14" fontWeight="700" fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        N
      </text>
    </svg>
  );
}

/** Marks a file as coming from this app's own "Exportar dados", not a bank — same badge shape as BankLogo, own color. */
function InternalLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="var(--mantine-color-petrol-6)" />
      <text
        x="12" y="16" textAnchor="middle"
        fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif"
        fill="#fff"
      >
        NC
      </text>
    </svg>
  );
}
