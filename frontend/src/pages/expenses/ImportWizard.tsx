import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  Group,
  Loader,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import type {
  ImportAnalysisDTO,
  ImportMergeGroupDTO,
  ImportRecordDTO,
  ImportReportDTO,
  NotImportedReason,
} from '@shared/contracts';
import { BANK_PROVIDERS, INTERNAL_SOURCE_ID, type ImportSourceId } from '@shared/domain';
import { brl } from '@shared/format';
import { useAnalyzeImport, useRunImport } from '../../api/hooks';
import { notifyError } from '../../feedback';
import { BankLogo, InternalLogo } from './ImportLogos';

/** Bank files are sniffed by content; the internal export is a fixed .json shape, so its extension is all that's checked. */
const acceptedExtensionsFor = (source: ImportSourceId) =>
  source === INTERNAL_SOURCE_ID ? ['.json'] : ['.csv', '.ofx'];

const brDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/** Why each kind of record was left out — worded for the person reading the summary. */
const REASON_LABELS: Record<NotImportedReason, { title: string; hint: string }> = {
  duplicate: { title: 'Já existe no sistema', hint: 'Foram importados antes, ou aparecem repetidos em outro arquivo.' },
  merged: { title: 'Unificados por você', hint: 'Somados em um único gasto, como você pediu.' },
  invoicePayment: { title: 'Pagamento de fatura', hint: 'Pagar a fatura não é gasto: a compra já está na fatura.' },
  creditRejected: { title: 'Entradas que você não aceitou', hint: 'Você escolheu deixar estas entradas de fora.' },
  monthLocked: { title: 'Mês já finalizado', hint: 'Reabra seus lançamentos no Meu painel para importar.' },
};
const REASON_ORDER: NotImportedReason[] = ['duplicate', 'merged', 'invoicePayment', 'creditRejected', 'monthLocked'];

/**
 * Three steps: files → decisions → summary. Nothing is saved until the second
 * step's "Importar": the first step only analyzes, and the same files travel
 * again with the user's answers. The backend recomputes everything from the
 * files, so the ids in the answers can't point at anything the files don't hold.
 */
export function ImportWizard({ onClose, allowInternal }: { onClose: () => void; allowInternal: boolean }) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [step, setStep] = useState(0);
  const [bank, setBank] = useState<ImportSourceId>(BANK_PROVIDERS[0].id);
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<ImportAnalysisDTO | null>(null);
  const [report, setReport] = useState<ImportReportDTO | null>(null);
  // Defaults favour the common case: unify what looks duplicated, accept every entry.
  const [merge, setMerge] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const analyze = useAnalyzeImport();
  const run = useRunImport();
  const extensions = acceptedExtensionsFor(bank);
  const isInternal = bank === INTERNAL_SOURCE_ID;

  const addFiles = (dropped: File[]) => {
    const valid = dropped.filter((f) => extensions.some((ext) => f.name.toLowerCase().endsWith(ext)));
    if (valid.length < dropped.length) notifyError(`Envie apenas arquivos ${extensions.join(' ou ')}.`);
    setFiles((prev) => [...prev, ...valid]);
  };

  const pickSource = (source: ImportSourceId) => {
    setBank(source);
    setFiles([]);
  };

  const goToDecisions = () =>
    analyze.mutate(
      { bank, files },
      {
        onSuccess: (result) => {
          const failed = result.files.filter((f) => f.status === 'error');
          if (failed.length === result.files.length) {
            failed.forEach((f) => notifyError(`${f.fileName}: ${f.message ?? 'não foi possível ler o arquivo.'}`));
            return;
          }
          setAnalysis(result);
          setMerge(new Set(result.mergeGroups.map((g) => g.id)));
          setAccepted(new Set(result.credits.map((c) => c.id)));
          setStep(1);
        },
        onError: (e) => notifyError(e.message),
      },
    );

  const startImport = () => {
    // The files that failed the analysis are not sent again.
    const okNames = new Set(analysis!.files.filter((f) => f.status === 'ok').map((f) => f.fileName));
    setStep(2);
    run.mutate(
      {
        bank,
        files: files.filter((f) => okNames.has(f.name)),
        decisions: { mergeGroupIds: [...merge], acceptedCreditIds: [...accepted] },
      },
      {
        onSuccess: setReport,
        onError: (e) => {
          notifyError(e.message);
          setStep(1);
        },
      },
    );
  };

  return (
    <Stack gap="lg">
      <Stepper active={step} size="sm" allowNextStepsSelect={false}>
        <Stepper.Step label="Arquivos" />
        <Stepper.Step label="Decisões" />
        <Stepper.Step label="Resumo" />
      </Stepper>

      {step === 0 && (
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} c="dimmed" mb={6}>Origem</Text>
            <Group gap="sm">
              {BANK_PROVIDERS.map((b) => (
                <SourceButton key={b.id} selected={b.id === bank} onClick={() => pickSource(b.id)} label={b.name}>
                  <BankLogo size={26} />
                </SourceButton>
              ))}
              {allowInternal && (
                <SourceButton selected={isInternal} onClick={() => pickSource(INTERNAL_SOURCE_ID)} label="Interno">
                  <InternalLogo size={26} />
                </SourceButton>
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
                  {isInternal ? 'O .json baixado em "Exportar dados"' : 'Aceita vários arquivos de uma vez — .csv ou .ofx'}
                </Text>
              </Stack>
            </Dropzone>
          </div>

          {files.length > 0 && (
            <Stack gap={4}>
              {files.map((f, i) => (
                <Group key={`${f.name}-${i}`} justify="space-between" wrap="nowrap">
                  <Text size="sm" truncate>{f.name}</Text>
                  <ActionIcon
                    variant="subtle" color="brick" size={44} aria-label={`Remover ${f.name}`}
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          )}

          <Group justify="flex-end" grow={isMobile ?? false} mt="md">
            <Button h={isMobile ? 44 : undefined} variant="default" onClick={onClose}>Cancelar</Button>
            <Button h={isMobile ? 44 : undefined} disabled={files.length === 0} loading={analyze.isPending} onClick={goToDecisions}>
              Continuar
            </Button>
          </Group>
        </Stack>
      )}

      {step === 1 && analysis && (
        <DecisionsStep
          analysis={analysis}
          merge={merge}
          setMerge={setMerge}
          accepted={accepted}
          setAccepted={setAccepted}
          isMobile={!!isMobile}
          onBack={() => setStep(0)}
          onImport={startImport}
        />
      )}

      {step === 2 && !report && (
        <Stack align="center" gap="md" py="xl">
          <Loader color="petrol" />
          <Text c="dimmed">Importando {files.length === 1 ? 'o arquivo' : `os ${files.length} arquivos`}…</Text>
        </Stack>
      )}

      {step === 2 && report && <SummaryStep report={report} onClose={onClose} isMobile={!!isMobile} />}
    </Stack>
  );
}

function SourceButton({ selected, onClick, label, children }: {
  selected: boolean; onClick: () => void; label: string; children: React.ReactNode;
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      p="sm"
      mih={44}
      style={{
        borderRadius: 8,
        border: `1.5px solid ${selected ? 'var(--mantine-color-petrol-6)' : 'var(--gf-line)'}`,
        background: selected ? 'var(--mantine-color-petrol-0)' : undefined,
      }}
    >
      <Group gap={8}>
        {children}
        <Text size="sm" fw={600}>{label}</Text>
      </Group>
    </UnstyledButton>
  );
}

function DecisionsStep({ analysis, merge, setMerge, accepted, setAccepted, isMobile, onBack, onImport }: {
  analysis: ImportAnalysisDTO;
  merge: Set<string>;
  setMerge: (s: Set<string>) => void;
  accepted: Set<string>;
  setAccepted: (s: Set<string>) => void;
  isMobile: boolean;
  onBack: () => void;
  onImport: () => void;
}) {
  const failed = analysis.files.filter((f) => f.status === 'error');
  const toggle = (set: Set<string>, id: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(id); else next.delete(id);
    return next;
  };
  const nothingToDecide = analysis.mergeGroups.length === 0 && analysis.credits.length === 0;
  const total = analysis.files.reduce((s, f) => s + f.expensesCount, 0);

  return (
    <Stack gap="md">
      {failed.map((f) => (
        <Alert key={f.fileName} color="brick" title={f.fileName}>{f.message}</Alert>
      ))}

      <Text size="sm" c="dimmed">
        {nothingToDecide
          ? `Encontramos ${total} gastos e nenhum ponto pede sua decisão. Nada foi importado ainda.`
          : 'Nada foi importado ainda. Escolha o que fazer em cada ponto e clique em Importar.'}
      </Text>
      {analysis.duplicatesCount > 0 && (
        <Text size="sm" c="dimmed">
          {analysis.duplicatesCount} lançamento{analysis.duplicatesCount === 1 ? '' : 's'} já existe{analysis.duplicatesCount === 1 ? '' : 'm'} no sistema e ficam de fora.
        </Text>
      )}

      {analysis.mergeGroups.map((g) => (
        <MergeCard key={g.id} group={g} unify={merge.has(g.id)} onChange={(on) => setMerge(toggle(merge, g.id, on))} />
      ))}

      {analysis.credits.length > 0 && (
        <CreditsCard
          credits={analysis.credits}
          accepted={accepted}
          onToggle={(id, on) => setAccepted(toggle(accepted, id, on))}
          onAll={(on) => setAccepted(on ? new Set(analysis.credits.map((c) => c.id)) : new Set())}
        />
      )}

      <Group justify="space-between" grow={isMobile} mt="md">
        <Button h={isMobile ? 44 : undefined} variant="default" onClick={onBack}>Voltar</Button>
        <Button h={isMobile ? 44 : undefined} onClick={onImport}>Importar</Button>
      </Group>
    </Stack>
  );
}

function RecordRow({ record, dim }: { record: ImportRecordDTO; dim?: boolean }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="sm" opacity={dim ? 0.5 : 1}>
      <Text size="sm" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        <Text span c="dimmed" className="num">{brDate(record.date)}</Text> · {record.description}
      </Text>
      <Text size="sm" fw={600} className="num" style={{ whiteSpace: 'nowrap' }}>{brl(record.amount)}</Text>
    </Group>
  );
}

function MergeCard({ group, unify, onChange }: { group: ImportMergeGroupDTO; unify: boolean; onChange: (on: boolean) => void }) {
  const [open, { toggle }] = useDisclosure(false);
  const sum = group.items.reduce((s, i) => s + i.amount, 0);
  const installments = group.kind === 'installments';

  return (
    <Card withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Title order={4} fz={17}>
            {installments ? 'Unificar parcelas de' : 'Unificar gastos'} {group.title}?
          </Title>
          <Badge variant="light" color="mustard">{group.items.length} lançamentos</Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {installments
            ? 'São parcelas da mesma compra no mesmo mês, com a descrição diferente só no final. '
            : 'Mesma descrição no mesmo mês. '}
          Unificando, vira <b>um gasto</b>: “{group.merged.description}”,{' '}
          <b className="num">{brl(group.merged.amount)}</b>, em {brDate(group.merged.date)}.
        </Text>
        <SegmentedControl
          value={unify ? 'merge' : 'keep'}
          onChange={(v) => onChange(v === 'merge')}
          data={[{ value: 'merge', label: 'Unificar' }, { value: 'keep', label: 'Manter separados' }]}
          style={{ alignSelf: 'flex-start' }}
        />
        <UnstyledButton onClick={toggle} c="petrol.6" fw={600} fz="sm" aria-expanded={open}>
          {open ? '▾ Ocultar' : '▸ Ver'} os {group.items.length} lançamentos
        </UnstyledButton>
        <Collapse expanded={open}>
          <Stack gap={6} pt={4}>
            {group.items.map((i) => <RecordRow key={i.id} record={i} />)}
            <Group justify="space-between" pt={6} style={{ borderTop: '1px solid var(--gf-line)' }}>
              <Text size="sm" fw={600}>{unify ? 'Resultado: 1 gasto' : `Resultado: ${group.items.length} gastos`}</Text>
              <Text size="sm" fw={600} className="num">{brl(unify ? group.merged.amount : sum)}</Text>
            </Group>
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}

function CreditsCard({ credits, accepted, onToggle, onAll }: {
  credits: ImportRecordDTO[];
  accepted: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  onAll: (on: boolean) => void;
}) {
  const [open, { toggle }] = useDisclosure(false);
  const chosen = credits.filter((c) => accepted.has(c.id));

  return (
    <Card withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Title order={4} fz={17}>Entradas recebidas</Title>
          <Badge variant="light" color="mustard">{chosen.length} de {credits.length} aceitas</Badge>
        </Group>
        <Text size="sm" c="dimmed">
          O extrato da conta traz {credits.length} Pix e transferências recebidos. Escolha quais viram entrada.
        </Text>
        <UnstyledButton onClick={toggle} c="petrol.6" fw={600} fz="sm" aria-expanded={open}>
          {open ? '▾ Ocultar' : '▸ Escolher'} as entradas
        </UnstyledButton>
        <Collapse expanded={open}>
          <Stack gap="xs" pt={4}>
            <Group gap="md">
              <UnstyledButton onClick={() => onAll(true)} c="petrol.6" fw={600} fz="sm">Aceitar todas</UnstyledButton>
              <UnstyledButton onClick={() => onAll(false)} c="petrol.6" fw={600} fz="sm">Recusar todas</UnstyledButton>
            </Group>
            {credits.map((c) => (
              <Checkbox
                key={c.id}
                checked={accepted.has(c.id)}
                onChange={(e) => onToggle(c.id, e.currentTarget.checked)}
                label={<RecordRow record={c} dim={!accepted.has(c.id)} />}
                styles={{ body: { alignItems: 'center' }, labelWrapper: { flex: 1, minWidth: 0 } }}
              />
            ))}
            <Group justify="space-between" pt={6} style={{ borderTop: '1px solid var(--gf-line)' }}>
              <Text size="sm" fw={600}>Total aceito</Text>
              <Text size="sm" fw={600} className="num" c="var(--gf-credit)">
                {brl(chosen.reduce((s, c) => s + c.amount, 0))}
              </Text>
            </Group>
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}

function SummaryStep({ report, onClose, isMobile }: { report: ImportReportDTO; onClose: () => void; isMobile: boolean }) {
  const failed = report.files.filter((f) => f.status === 'error');
  const expenses = report.imported.filter((r) => r.kind === 'expense');
  const incomes = report.imported.filter((r) => r.kind === 'income');
  const byReason = useMemo(
    () => REASON_ORDER.map((reason) => ({ reason, items: report.notImported.filter((n) => n.reason === reason) })).filter((g) => g.items.length > 0),
    [report],
  );

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
        <Kpi value={expenses.length} label="gastos importados" color="var(--gf-credit)" />
        <Kpi value={incomes.length} label="entradas importadas" color="var(--gf-credit)" />
        <Kpi value={report.notImported.length} label="não importados" color="var(--gf-mustard)" />
      </SimpleGrid>

      {failed.map((f) => (
        <Alert key={f.fileName} color="brick" title={`${f.fileName} não foi importado`}>{f.message}</Alert>
      ))}

      <RecordsSection title="Importados" count={report.imported.length}>
        {report.imported.map((r) => (
          <Stack key={`${r.kind}-${r.id}`} gap={0}>
            <RecordRow record={r} />
            {r.mergedFrom && <Text size="xs" c="dimmed">Unificado a partir de {r.mergedFrom} lançamentos</Text>}
          </Stack>
        ))}
      </RecordsSection>

      {byReason.length > 0 && (
        <div>
          <Group justify="space-between" mb={8}>
            <Title order={4} fz={17}>Não importados</Title>
            <Text size="xs" c="dimmed" tt="uppercase">{report.notImported.length} no total</Text>
          </Group>
          <Stack gap="sm">
            {byReason.map(({ reason, items }) => (
              <RecordsSection key={reason} title={REASON_LABELS[reason].title} hint={REASON_LABELS[reason].hint} count={items.length}>
                {items.map((n) => (
                  <Stack key={`${n.kind}-${n.id}`} gap={0}>
                    <RecordRow record={n} />
                    {n.detail && <Text size="xs" c="dimmed">{n.detail}</Text>}
                  </Stack>
                ))}
              </RecordsSection>
            ))}
          </Stack>
        </div>
      )}

      <Group justify="flex-end" grow={isMobile} mt="md">
        <Button h={isMobile ? 44 : undefined} onClick={onClose}>Concluir</Button>
      </Group>
    </Stack>
  );
}

function Kpi({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Card withBorder p="sm" radius="md">
      <Text fz={28} lh={1.1} c={color} className="num" ff="var(--mantine-font-family-headings)">{value}</Text>
      <Text size="xs" c="dimmed">{label}</Text>
    </Card>
  );
}

function RecordsSection({ title, hint, count, children }: { title: string; hint?: string; count: number; children: React.ReactNode }) {
  const [open, { toggle }] = useDisclosure(false);
  return (
    <Card withBorder p="sm" radius="md">
      <Stack gap={4}>
        <Group justify="space-between">
          <Text fw={600}>{title}</Text>
          <Badge variant="light" color="mustard">{count}</Badge>
        </Group>
        {hint && <Text size="sm" c="dimmed">{hint}</Text>}
        <UnstyledButton onClick={toggle} c="petrol.6" fw={600} fz="sm" aria-expanded={open}>
          {open ? '▾ Ocultar' : '▸ Ver'} detalhes
        </UnstyledButton>
        <Collapse expanded={open}>
          <Stack gap={8} pt={4}>{children}</Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}
