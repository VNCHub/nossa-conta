import { Injectable } from '@nestjs/common';
import { ErrorSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ErrorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomic: two occurrences of a brand-new error arriving at the same instant
   * both race to create the issue, and the unique fingerprint makes Postgres
   * resolve that race — no manual "find, then create if missing" needed.
   */
  upsertIssue(input: { fingerprint: string; source: ErrorSource; title: string }) {
    return this.prisma.errorIssue.upsert({
      where: { fingerprint: input.fingerprint },
      create: { ...input, eventsCount: 1 },
      update: { lastSeenAt: new Date(), eventsCount: { increment: 1 } },
    });
  }

  createEvent(input: { issueId: string; title: string; stack: string }) {
    return this.prisma.errorEvent.create({ data: input });
  }

  async listIssues(skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.errorIssue.findMany({ orderBy: { lastSeenAt: 'desc' }, skip, take }),
      this.prisma.errorIssue.count(),
    ]);
    return { items, total };
  }

  findIssueById(id: string) {
    return this.prisma.errorIssue.findUnique({ where: { id } });
  }

  async listEvents(issueId: string, skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.errorEvent.findMany({
        where: { issueId },
        orderBy: { occurredAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.errorEvent.count({ where: { issueId } }),
    ]);
    return { items, total };
  }
}
