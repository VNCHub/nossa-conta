import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ImportFileFormat } from '@shared/domain';

/**
 * The only place that touches the imported files on disk. Filenames are
 * generated, never taken from the upload — the user-supplied name is only
 * ever kept as a display string in the database, so it can't be used to
 * escape the storage directory.
 */
@Injectable()
export class ImportsStorage {
  private readonly dir: string;

  constructor(private readonly config: ConfigService) {
    this.dir = resolve(this.config.get<string>('IMPORT_STORAGE_DIR') ?? './storage/imports');
  }

  async save(buffer: Buffer, format: ImportFileFormat): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const path = join(this.dir, `${randomUUID()}.${format}`);
    await writeFile(path, buffer);
    return path;
  }

  /** Best-effort cleanup of a file just written when the DB transaction that should follow it fails. */
  async remove(path: string): Promise<void> {
    await rm(path, { force: true });
  }
}
