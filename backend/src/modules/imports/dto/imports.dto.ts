import { IsIn } from 'class-validator';
import { BANK_PROVIDERS, type BankId } from '@shared/domain';

const BANK_IDS = BANK_PROVIDERS.map((b) => b.id) as BankId[];

/** Multipart text field alongside the uploaded files. */
export class ImportFilesDto {
  @IsIn(BANK_IDS, { message: 'Banco não suportado.' })
  bank!: BankId;
}
