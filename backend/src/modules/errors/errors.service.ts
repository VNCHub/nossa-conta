import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorSource as ErrorSourceDb } from '@prisma/client';
import type { ErrorSource } from '@shared/domain';
import type { ErrorEventDTO, ErrorIssueDetailDTO, ErrorIssueDTO, PaginatedDTO } from '@shared/contracts';
import { computeFingerprint, summarizeTitle } from '../../domain/observability/fingerprint';
import { ErrorsRepository } from './errors.repository';

const DEFAULT_PAGE_SIZE = 20;

const DB_SOURCE: Record<ErrorSource, ErrorSourceDb> = {
  frontend: ErrorSourceDb.FRONTEND,
  backend: ErrorSourceDb.BACKEND,
};
const DTO_SOURCE: Record<ErrorSourceDb, ErrorSource> = {
  [ErrorSourceDb.FRONTEND]: 'frontend',
  [ErrorSourceDb.BACKEND]: 'backend',
};

interface Issue {
  id: string;
  source: ErrorSourceDb;
  fingerprint: string;
  title: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  eventsCount: number;
}

interface Event {
  id: string;
  title: string;
  stack: string;
  occurredAt: Date;
}

const toIssueDTO = (i: Issue): ErrorIssueDTO => ({
  id: i.id,
  source: DTO_SOURCE[i.source],
  title: i.title,
  fingerprint: i.fingerprint,
  firstSeenAt: i.firstSeenAt.toISOString(),
  lastSeenAt: i.lastSeenAt.toISOString(),
  eventsCount: i.eventsCount,
});

const toEventDTO = (e: Event): ErrorEventDTO => ({
  id: e.id,
  title: e.title,
  stack: e.stack,
  occurredAt: e.occurredAt.toISOString(),
});

/**
 * Single entry point for logging any error, frontend or backend: the public
 * ingest endpoint and the backend's own exception filters both call this, so
 * grouping/summarizing only happens in one place.
 */
@Injectable()
export class ErrorsService {
  constructor(private readonly errors: ErrorsRepository) {}

  async report(input: { source: ErrorSource; title: string; stack: string }): Promise<void> {
    const fingerprint = computeFingerprint(input.source, input.title, input.stack);
    const issue = await this.errors.upsertIssue({
      fingerprint,
      source: DB_SOURCE[input.source],
      title: summarizeTitle(input.title),
    });
    await this.errors.createEvent({ issueId: issue.id, title: input.title, stack: input.stack });
  }

  async listIssues(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<PaginatedDTO<ErrorIssueDTO>> {
    const skip = (page - 1) * pageSize;
    const { items, total } = await this.errors.listIssues(skip, pageSize);
    return { items: items.map(toIssueDTO), total, page, pageSize };
  }

  async getIssueDetail(
    id: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<ErrorIssueDetailDTO> {
    const issue = await this.errors.findIssueById(id);
    if (!issue) throw new NotFoundException('Issue não encontrada.');

    const skip = (page - 1) * pageSize;
    const { items, total } = await this.errors.listEvents(id, skip, pageSize);
    return {
      issue: toIssueDTO(issue),
      events: { items: items.map(toEventDTO), total, page, pageSize },
    };
  }
}
