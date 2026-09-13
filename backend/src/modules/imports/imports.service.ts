import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BankProvider as BankProviderDb,
  ImportDocumentType as ImportDocumentTypeDb,
  ImportFileFormat as ImportFileFormatDb,
  IncomeType as IncomeTypeDb,
  RecordSource,
} from '@prisma/client';
import type { ImportedFileDTO, ImportResultDTO } from '@shared/contracts';
import type {
  BankId,
  ImportDocumentType,
  ImportFileFormat,
} from '@shared/domain';
import {
  detectDocumentType,
  detectFormat,
  fingerprintOf,
  mapToRecords,
  parseFile,
  periodOf,
  type RawTransaction,
} from '../../domain/bank-import';
import { ImportsRepository, type ImportedFileWithCounts } from './imports.repository';
import { ImportsStorage } from './imports.storage';

const ACCEPTED_EXTENSIONS = ['.csv', '.ofx'];

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly repo: ImportsRepository,
    private readonly storage: ImportsStorage,
    private readonly config: ConfigService,
  ) {}

  async list(familyId: string): Promise<ImportedFileDTO[]> {
    const rows = await this.repo.list(familyId);
    return rows.map(toDTO);
  }

  async importFiles(
    familyId: string,
    userId: string,
    bank: BankId,
    files: Express.Multer.File[],
  ): Promise<ImportResultDTO[]> {
    if (files.length === 0) {
      throw new BadRequestException('Envie pelo menos um arquivo.');
    }
    const results: ImportResultDTO[] = [];
    for (const file of files) {
      results.push(await this.processFile(familyId, userId, bank, file));
    }
    return results;
  }

  private async processFile(
    familyId: string,
    userId: string,
    bank: BankId,
    file: Express.Multer.File,
  ): Promise<ImportResultDTO> {
    const fileName = file.originalname;

    if (!ACCEPTED_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext))) {
      return { fileName, status: 'error', message: 'Envie um arquivo .csv ou .ofx.' };
    }

    const fingerprint = fingerprintOf(file.buffer);
    if (await this.repo.findByFingerprint(familyId, fingerprint)) {
      return { fileName, status: 'error', message: 'Este arquivo já foi importado antes.' };
    }

    const format = detectFormat(file.buffer);
    if (!format) {
      return {
        fileName,
        status: 'error',
        message: 'Não foi possível reconhecer o formato do arquivo.',
      };
    }

    const documentType = detectDocumentType(file.buffer, format);
    if (!documentType) {
      return {
        fileName,
        status: 'error',
        message: 'O conteúdo do arquivo não corresponde a um extrato do Nubank aceito.',
      };
    }

    let transactions: RawTransaction[];
    try {
      transactions = parseFile(file.buffer, bank, documentType, format);
    } catch (err) {
      this.logger.warn(`Failed to parse ${fileName}: ${(err as Error).message}`);
      return { fileName, status: 'error', message: 'Não foi possível interpretar o arquivo.' };
    }

    const period = periodOf(transactions);
    if (!period) {
      return { fileName, status: 'error', message: 'Nenhum lançamento encontrado no arquivo.' };
    }

    const mapped = mapToRecords(transactions, documentType, bank);

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
          expiresAt: this.expiresAt(),
          userId,
          familyId,
        },
        expenses: mapped.expenses.map((e) => ({
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
        incomes: mapped.incomes.map((i) => ({
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

  private expiresAt(): Date {
    const days = Number(this.config.get<string>('IMPORT_RETENTION_DAYS') ?? 7);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

/** Only Nubank exists today — this is where a second bank's mapping would be added. */
function bankDbOf(bank: BankId): BankProviderDb {
  if (bank === 'nubank') return BankProviderDb.NUBANK;
  throw new Error(`Unsupported bank: ${bank satisfies never}`);
}

function documentTypeDbOf(t: ImportDocumentType): ImportDocumentTypeDb {
  return t === 'accountStatement'
    ? ImportDocumentTypeDb.ACCOUNT_STATEMENT
    : ImportDocumentTypeDb.INVOICE;
}

function fileFormatDbOf(f: ImportFileFormat): ImportFileFormatDb {
  return f === 'csv' ? ImportFileFormatDb.CSV : ImportFileFormatDb.OFX;
}

function toDTO(row: ImportedFileWithCounts): ImportedFileDTO {
  return {
    id: row.id,
    bank: 'nubank',
    documentType: row.documentType === ImportDocumentTypeDb.ACCOUNT_STATEMENT ? 'accountStatement' : 'invoice',
    fileFormat: row.fileFormat === ImportFileFormatDb.CSV ? 'csv' : 'ofx',
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
