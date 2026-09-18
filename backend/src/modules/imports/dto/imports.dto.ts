import { IsIn } from 'class-validator';
import { BANK_PROVIDERS, INTERNAL_SOURCE_ID, type ImportSourceId } from '@shared/domain';

const SOURCE_IDS = [...BANK_PROVIDERS.map((b) => b.id), INTERNAL_SOURCE_ID] as ImportSourceId[];

/** Multipart text field alongside the uploaded files. */
export class ImportFilesDto {
  @IsIn(SOURCE_IDS, { message: 'Origem não suportada.' })
  bank!: ImportSourceId;
}
