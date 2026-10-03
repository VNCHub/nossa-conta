import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BankProvider as BankProviderDb,
  ImportDocumentType as ImportDocumentTypeDb,
  ImportFileFormat as ImportFileFormatDb,
  IncomeType as IncomeTypeDb,
  RecordSource,
} from '@prisma/client';
import type {
  ImportAnalysisDTO,
  ImportAnalysisFileDTO,
  ImportDecisionsDTO,
  ImportedFileDTO,
  ImportRecordDTO,
  ImportReportDTO,
  ImportResultDTO,
  NotImportedRecordDTO,
} from '@shared/contracts';
import type {
  AppRole,
  BankId,
  ImportDocumentType,
  ImportFileFormat,
  ImportSourceId,
} from '@shared/domain';
import {
  detectDocumentType,
  detectFormat,
  findMergeGroups,
  fingerprintOf,
  mapToRecords,
  parseFile,
  periodOf,
  type ExpenseSeed,
  type IncomeSeed,
  type MappedImport,
  type MergeGroup,
  type RawTransaction,
} from '../../domain/bank-import';
import { expenseKeyOf, parseInternalExport, type InternalExpenseEntry } from '../../domain/internal-export';
import { toDbExpenseType } from '../expenses/expenses.service';
import { ImportsRepository, type ImportedFileWithCounts } from './imports.repository';
import { ImportsStorage } from './imports.storage';
import { MonthLocksService } from '../months/month-locks.service';
import { monthLabel } from '@shared/format';

const ACCEPTED_EXTENSIONS = ['.csv', '.ofx'];

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly repo: ImportsRepository,
    private readonly storage: ImportsStorage,
    private readonly config: ConfigService,
    private readonly locks: MonthLocksService,
  ) {}

  async list(familyId: string): Promise<ImportedFileDTO[]> {
    const rows = await this.repo.list(familyId);
    return rows.map(toDTO);
  }

  /**
   * Reads the files and works out what the user may want to decide — without
   * saving anything. The wizard sends the same files again with the answers.
   */
  async analyze(
    familyId: string,
    userId: string,
    roles: AppRole[],
    source: ImportSourceId,
    files: Express.Multer.File[],
  ): Promise<ImportAnalysisDTO> {
    this.assertCanImport(source, roles, files);

    if (source === 'internal') {
      const reads = await Promise.all(files.map((f) => this.readInternalFile(familyId, f)));
      return {
        files: reads.map((r, i) =>
          'error' in r
            ? { fileName: files[i].originalname, status: 'error', message: r.error, expensesCount: 0, creditsCount: 0 }
            : { fileName: files[i].originalname, status: 'ok', documentType: 'internalExport', expensesCount: r.entries.length, creditsCount: 0 },
        ),
        mergeGroups: [],
        credits: [],
        duplicatesCount: 0,
      };
    }

    const { ready, failed } = await this.prepareBankFiles(familyId, userId, source, files);
    const { fresh, notImported } = await this.dropDuplicates(familyId, userId, ready);
    const groups = this.groupsOf(fresh);

    const fileNameOf = (seed: ExpenseSeed) => fresh.find((f) => f.expenses.includes(seed))!.prepared.file.originalname;
    const analysisFiles: ImportAnalysisFileDTO[] = [
      ...fresh.map((f) => ({
        fileName: f.prepared.file.originalname,
        status: 'ok' as const,
        documentType: f.prepared.documentType,
        expensesCount: f.expenses.length,
        creditsCount: f.credits.length,
      })),
      ...failed.map((r) => ({
        fileName: r.fileName,
        status: 'error' as const,
        message: r.message,
        expensesCount: 0,
        creditsCount: 0,
      })),
    ];

    return {
      files: analysisFiles,
      mergeGroups: groups.map((g) => ({
        id: g.id,
        kind: g.kind,
        title: g.title,
        month: g.month,
        items: g.members.map((m) => expenseRecord(m, fileNameOf(m))),
        merged: { description: g.merged.description, amount: g.merged.amount, date: g.merged.date },
      })),
      credits: fresh.flatMap((f) => f.credits.map((c) => incomeRecord(c, f.prepared.file.originalname))),
      duplicatesCount: notImported.length,
    };
  }

  async importFiles(
    familyId: string,
    userId: string,
    roles: AppRole[],
    source: ImportSourceId,
    files: Express.Multer.File[],
    rawDecisions?: string,
  ): Promise<ImportReportDTO> {
    this.assertCanImport(source, roles, files);
    const decisions = parseDecisions(rawDecisions);

    if (source === 'internal') {
      const report: ImportReportDTO = { files: [], imported: [], notImported: [] };
      for (const file of files) {
        const { result, entries } = await this.processInternalFile(familyId, userId, file);
        report.files.push(result);
        if (result.status === 'success') {
          report.imported.push(...entries.map((e) => expenseRecord(
            { date: e.date, description: e.description, amount: e.amount, importKey: `internal:${expenseKeyOf(e)}`, paymentMethod: e.paymentMethod },
            file.originalname,
          )));
        }
      }
      return report;
    }

    const { ready, failed } = await this.prepareBankFiles(familyId, userId, source, files);
    const { fresh, notImported } = await this.dropDuplicates(familyId, userId, ready);
    const finalized = new Set(await this.locks.monthsFinalizedBy(familyId, userId));

    // Unify the groups the user picked: members leave their files, one
    // expense takes their place in the file of the earliest member.
    const merges = new Map(this.groupsOf(fresh).map((g) => [g.id, g]));
    for (const id of decisions.mergeGroupIds) {
      const group = merges.get(id);
      if (!group) continue;
      const home = fresh.find((f) => f.expenses.includes(group.members[0]))!;
      for (const m of group.members) {
        const owner = fresh.find((f) => f.expenses.includes(m))!;
        owner.expenses = owner.expenses.filter((e) => e !== m);
        notImported.push({
          ...expenseRecord(m, owner.prepared.file.originalname),
          reason: 'merged',
          detail: `Unificado em “${group.merged.description}”.`,
        });
      }
      home.expenses.push(group.merged);
      home.mergedFrom.set(group.merged.importKey, group.members.length);
    }

    // Credits are opt-in: only the ones the user ticked become incomes.
    const accepted = new Set(decisions.acceptedCreditIds);
    for (const f of fresh) {
      for (const c of f.credits) {
        const record = incomeRecord(c, f.prepared.file.originalname);
        if (!accepted.has(c.importKey)) {
          notImported.push({ ...record, reason: 'creditRejected', detail: 'Você escolheu não aceitar esta entrada.' });
        } else if (finalized.has(c.date.slice(0, 7))) {
          notImported.push({ ...record, reason: 'monthLocked', detail: 'O mês já foi finalizado por você. Reabra seus lançamentos para importar.' });
        } else {
          f.incomes.push(c);
        }
      }
    }
    for (const f of fresh) {
      for (const x of f.prepared.mapped.excluded) {
        notImported.push({
          id: `excluded:${x.date}:${x.description}:${x.amount}`,
          kind: x.kind,
          date: x.date,
          description: x.description,
          amount: x.amount,
          fileName: f.prepared.file.originalname,
          reason: x.reason,
          detail: 'Pagar a fatura não é gasto: a compra já está na fatura.',
        });
      }
    }

    const report: ImportReportDTO = { files: [], imported: [], notImported };
    for (const f of fresh) {
      const result = await this.saveBankFile(familyId, userId, source, f);
      report.files.push(result);
      if (result.status === 'success') {
        const name = f.prepared.file.originalname;
        report.imported.push(
          ...f.expenses.map((e) => ({ ...expenseRecord(e, name), mergedFrom: f.mergedFrom.get(e.importKey) })),
          ...f.incomes.map((i) => incomeRecord(i, name)),
        );
      } else {
        // Nothing of this file was saved, so nothing it planned counts as imported.
        report.notImported = report.notImported.filter((n) => n.fileName !== f.prepared.file.originalname);
      }
    }
    report.files.push(...failed);
    return report;
  }

  private assertCanImport(source: ImportSourceId, roles: AppRole[], files: Express.Multer.File[]) {
    // The internal export moves gastos between environments — a platform
    // operation, not something a family member does day to day.
    if (source === 'internal' && !roles.includes('admin')) {
      throw new ForbiddenException('Só o administrador pode fazer importações internas.');
    }
    if (files.length === 0) {
      throw new BadRequestException('Envie pelo menos um arquivo.');
    }
  }

  private async prepareBankFiles(familyId: string, userId: string, bank: BankId, files: Express.Multer.File[]) {
    const ready: PreparedBankFile[] = [];
    const failed: ImportResultDTO[] = [];
    for (const file of files) {
      const prepared = await this.prepareBankFile(familyId, userId, bank, file);
      if ('error' in prepared) failed.push({ fileName: file.originalname, status: 'error', message: prepared.error });
      else ready.push(prepared);
    }
    return { ready, failed };
  }

  /**
   * Everything a file needs to pass before its content is trusted: extension,
   * not seen before, recognizable, parseable, and clear of finalized months.
   */
  private async prepareBankFile(
    familyId: string,
    userId: string,
    bank: BankId,
    file: Express.Multer.File,
  ): Promise<PreparedBankFile | { error: string }> {
    const fileName = file.originalname;

    if (!ACCEPTED_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext))) {
      return { error: 'Envie um arquivo .csv ou .ofx.' };
    }

    const fingerprint = fingerprintOf(file.buffer);
    if (await this.repo.findByFingerprint(familyId, fingerprint)) {
      return { error: 'Este arquivo já foi importado antes.' };
    }

    const format = detectFormat(file.buffer);
    if (!format) return { error: 'Não foi possível reconhecer o formato do arquivo.' };

    const documentType = detectDocumentType(file.buffer, format);
    if (!documentType) {
      return { error: 'O conteúdo do arquivo não corresponde a um extrato do Nubank aceito.' };
    }

    let transactions: RawTransaction[];
    try {
      transactions = parseFile(file.buffer, bank, documentType, format);
    } catch (err) {
      this.logger.warn(`Failed to parse ${fileName}: ${(err as Error).message}`);
      return { error: 'Não foi possível interpretar o arquivo.' };
    }

    const period = periodOf(transactions);
    if (!period) return { error: 'Nenhum lançamento encontrado no arquivo.' };

    const mapped = mapToRecords(transactions, documentType, bank);

    const lockMessage = await this.lockedMonthsMessage(familyId, userId, [
      ...mapped.expenses.map((e) => e.date),
      ...mapped.incomes.map((i) => i.date),
    ]);
    if (lockMessage) return { error: lockMessage };

    return { file, fingerprint, format, documentType, period, mapped };
  }

  /**
   * Leaves out what is already in the system and what appears twice across
   * the uploaded files — the first occurrence wins. Returns each file's
   * remaining records plus the dropped ones, already worded for the report.
   */
  private async dropDuplicates(familyId: string, userId: string, ready: PreparedBankFile[]) {
    const existing = await this.repo.findExistingImportKeys(familyId, userId, {
      expenseKeys: ready.flatMap((p) => p.mapped.expenses.map((e) => e.importKey)),
      incomeKeys: ready.flatMap((p) => [...p.mapped.incomes, ...p.mapped.credits].map((i) => i.importKey)),
    });
    const seen = new Set<string>();
    const notImported: NotImportedRecordDTO[] = [];

    const fresh: FreshBankFile[] = ready.map((prepared) => {
      const fileName = prepared.file.originalname;
      let duplicates = 0;
      const keep = <T extends ExpenseSeed | IncomeSeed>(items: T[], record: (t: T, name: string) => ImportRecordDTO) =>
        items.filter((item) => {
          const inSystem = existing.has(item.importKey);
          if (!inSystem && !seen.has(item.importKey)) {
            seen.add(item.importKey);
            return true;
          }
          duplicates++;
          notImported.push({
            ...record(item, fileName),
            reason: 'duplicate',
            detail: inSystem ? 'Já existe no sistema, de uma importação anterior.' : 'Aparece repetido em outro arquivo enviado.',
          });
          return false;
        });
      return {
        prepared,
        expenses: keep(prepared.mapped.expenses, expenseRecord),
        incomes: keep(prepared.mapped.incomes, incomeRecord),
        credits: keep(prepared.mapped.credits, incomeRecord),
        duplicates,
        mergedFrom: new Map(),
      };
    });
    return { fresh, notImported };
  }

  /** Merge candidates across every file together — the same purchase can sit in two invoices. */
  private groupsOf(fresh: FreshBankFile[]): MergeGroup[] {
    return findMergeGroups(fresh.flatMap((f) => f.expenses));
  }

  private async saveBankFile(
    familyId: string,
    userId: string,
    bank: BankId,
    f: FreshBankFile,
  ): Promise<ImportResultDTO> {
    const { file, fingerprint, format, documentType, period } = f.prepared;
    const fileName = file.originalname;
    const storagePath = await this.storage.save(file.buffer, format);
    try {
      const saved = await this.repo.saveImport({
        file: {
          bank: bankDbOf(bank),
          documentType: documentTypeDbOf(documentType),
          fileFormat: fileFormatDbOf(format),
          originalName: fileName,
          storagePath,
          fingerprint,
          sizeBytes: file.size,
          periodStart: new Date(`${period.start}T00:00:00Z`),
          periodEnd: new Date(`${period.end}T00:00:00Z`),
          duplicateTransactionsSkipped: f.duplicates,
          expiresAt: this.expiresAt(),
          userId,
          familyId,
        },
        expenses: f.expenses.map((e) => ({
          userId,
          familyId,
          date: new Date(`${e.date}T00:00:00Z`),
          month: e.date.slice(0, 7),
          description: e.description,
          amount: e.amount,
          paymentMethod: e.paymentMethod,
          source: RecordSource.IMPORT,
          importKey: e.importKey,
        })),
        incomes: f.incomes.map((i) => ({
          userId,
          type: IncomeTypeDb.ONE_OFF,
          description: i.description,
          amount: i.amount,
          date: new Date(`${i.date}T00:00:00Z`),
          source: RecordSource.IMPORT,
          importKey: i.importKey,
        })),
      });
      return { fileName, status: 'success', file: toDTO(saved) };
    } catch (err) {
      // The transaction failed atomically (all-or-nothing) — the file on
      // disk is the only thing left to clean up.
      await this.storage.remove(storagePath);
      this.logger.error(`Failed to save import ${fileName}: ${(err as Error).message}`);
      return { fileName, status: 'error', message: 'Não foi possível salvar a importação.' };
    }
  }

  /**
   * A file from this app's own "Exportar dados" — already shaped as gastos,
   * so there is no bank to detect and no invoice/statement split. Every
   * imported row lands personal and unshared (source and target may be
   * different families entirely), same as a bank import.
   */
  private async readInternalFile(
    familyId: string,
    file: Express.Multer.File,
  ): Promise<{ entries: InternalExpenseEntry[]; fingerprint: string } | { error: string }> {
    if (!file.originalname.toLowerCase().endsWith('.json')) {
      return { error: 'Envie um arquivo .json exportado pela Nossa Conta.' };
    }

    const fingerprint = fingerprintOf(file.buffer);
    if (await this.repo.findByFingerprint(familyId, fingerprint)) {
      return { error: 'Este arquivo já foi importado antes.' };
    }

    let entries: InternalExpenseEntry[];
    try {
      entries = parseInternalExport(file.buffer);
    } catch (err) {
      return { error: (err as Error).message };
    }
    if (entries.length === 0) return { error: 'Nenhum gasto encontrado no arquivo.' };
    return { entries, fingerprint };
  }

  private async processInternalFile(
    familyId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ result: ImportResultDTO; entries: InternalExpenseEntry[] }> {
    const fileName = file.originalname;
    const read = await this.readInternalFile(familyId, file);
    if ('error' in read) return { result: { fileName, status: 'error', message: read.error }, entries: [] };
    const { entries, fingerprint } = read;

    const dates = entries.map((e) => e.date).sort();

    const lockMessage = await this.lockedMonthsMessage(familyId, userId, dates);
    if (lockMessage) return { result: { fileName, status: 'error', message: lockMessage }, entries: [] };
    const period = { start: dates[0], end: dates[dates.length - 1] };

    const storagePath = await this.storage.save(file.buffer, 'json');
    try {
      const saved = await this.repo.saveImport({
        file: {
          bank: BankProviderDb.INTERNAL,
          documentType: ImportDocumentTypeDb.INTERNAL_EXPORT,
          fileFormat: ImportFileFormatDb.JSON,
          originalName: fileName,
          storagePath,
          fingerprint,
          sizeBytes: file.size,
          periodStart: new Date(`${period.start}T00:00:00Z`),
          periodEnd: new Date(`${period.end}T00:00:00Z`),
          expiresAt: this.expiresAt(),
          userId,
          familyId,
        },
        expenses: entries.map((e) => ({
          userId,
          familyId,
          date: new Date(`${e.date}T00:00:00Z`),
          month: e.date.slice(0, 7),
          description: e.description,
          amount: e.amount,
          category: e.category,
          expenseType: toDbExpenseType(e.expenseType),
          paymentMethod: e.paymentMethod,
          source: RecordSource.IMPORT,
          importKey: `internal:${expenseKeyOf(e)}`,
        })),
        incomes: [],
      });

      return { result: { fileName, status: 'success', file: toDTO(saved) }, entries };
    } catch (err) {
      await this.storage.remove(storagePath);
      this.logger.error(`Failed to save import ${fileName}: ${(err as Error).message}`);
      return { result: { fileName, status: 'error', message: 'Não foi possível salvar a importação.' }, entries: [] };
    }
  }

  /**
   * A file is all-or-nothing, so one row in a finalized month rejects the whole
   * file — silently dropping those rows would leave the month looking complete
   * while part of the statement never made it in.
   */
  private async lockedMonthsMessage(
    familyId: string,
    userId: string,
    dates: string[],
  ): Promise<string | null> {
    const finalized = new Set(await this.locks.monthsFinalizedBy(familyId, userId));
    const hit = [...new Set(dates.map((d) => d.slice(0, 7)))].filter((m) => finalized.has(m)).sort();
    return hit.length
      ? `O arquivo tem lançamentos de ${hit.map(monthLabel).join(', ')}, que você já finalizou. Reabra seus lançamentos no Meu painel para importar.`
      : null;
  }

  private expiresAt(): Date {
    const days = Number(this.config.get<string>('IMPORT_RETENTION_DAYS') ?? 7);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

interface PreparedBankFile {
  file: Express.Multer.File;
  fingerprint: string;
  format: ImportFileFormat;
  documentType: ImportDocumentType;
  period: { start: string; end: string };
  mapped: MappedImport;
}

/** A file's records after duplicates are dropped — what the decisions then act on. */
interface FreshBankFile {
  prepared: PreparedBankFile;
  expenses: ExpenseSeed[];
  incomes: IncomeSeed[];
  credits: IncomeSeed[];
  duplicates: number;
  /** importKey of a unified expense → how many transactions it replaced */
  mergedFrom: Map<string, number>;
}

function expenseRecord(e: ExpenseSeed, fileName: string): ImportRecordDTO {
  return { id: e.importKey, kind: 'expense', date: e.date, description: e.description, amount: e.amount, fileName };
}

function incomeRecord(i: IncomeSeed, fileName: string): ImportRecordDTO {
  return { id: i.importKey, kind: 'income', date: i.date, description: i.description, amount: i.amount, fileName };
}

function parseDecisions(raw?: string): ImportDecisionsDTO {
  if (!raw) return { mergeGroupIds: [], acceptedCreditIds: [] };
  const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
  try {
    const parsed = JSON.parse(raw) as Partial<ImportDecisionsDTO>;
    if (isStrings(parsed.mergeGroupIds) && isStrings(parsed.acceptedCreditIds)) {
      return { mergeGroupIds: parsed.mergeGroupIds, acceptedCreditIds: parsed.acceptedCreditIds };
    }
  } catch {
    // falls through to the same error
  }
  throw new BadRequestException('Decisões da importação inválidas.');
}

/** Only Nubank exists today — this is where a second bank's mapping would be added. */
function bankDbOf(bank: BankId): BankProviderDb {
  if (bank === 'nubank') return BankProviderDb.NUBANK;
  throw new Error(`Unsupported bank: ${bank satisfies never}`);
}

/** Bank imports only — internal ones go through documentTypeDbOf's INTERNAL_EXPORT case directly. */
function documentTypeDbOf(t: ImportDocumentType): ImportDocumentTypeDb {
  return t === 'accountStatement'
    ? ImportDocumentTypeDb.ACCOUNT_STATEMENT
    : ImportDocumentTypeDb.INVOICE;
}

function fileFormatDbOf(f: ImportFileFormat): ImportFileFormatDb {
  return f === 'csv' ? ImportFileFormatDb.CSV : ImportFileFormatDb.OFX;
}

function sourceIdOf(bank: BankProviderDb): ImportSourceId {
  return bank === BankProviderDb.INTERNAL ? 'internal' : 'nubank';
}

function documentTypeOf(t: ImportDocumentTypeDb): ImportDocumentType {
  if (t === ImportDocumentTypeDb.INTERNAL_EXPORT) return 'internalExport';
  return t === ImportDocumentTypeDb.ACCOUNT_STATEMENT ? 'accountStatement' : 'invoice';
}

function fileFormatOf(f: ImportFileFormatDb): ImportFileFormat {
  if (f === ImportFileFormatDb.JSON) return 'json';
  return f === ImportFileFormatDb.CSV ? 'csv' : 'ofx';
}

function toDTO(row: ImportedFileWithCounts): ImportedFileDTO {
  return {
    id: row.id,
    bank: sourceIdOf(row.bank),
    documentType: documentTypeOf(row.documentType),
    fileFormat: fileFormatOf(row.fileFormat),
    originalName: row.originalName,
    sizeBytes: row.sizeBytes,
    periodStart: row.periodStart.toISOString().slice(0, 10),
    periodEnd: row.periodEnd.toISOString().slice(0, 10),
    expensesCount: row._count.expenses,
    incomesCount: row._count.incomes,
    duplicateTransactionsSkipped: row.duplicateTransactionsSkipped,
    importedBy: row.userId,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}
