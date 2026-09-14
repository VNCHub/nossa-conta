import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
import { ErrorsService } from '../../modules/errors/errors.service';

/**
 * Catch-all, registered last: NestJS picks the first filter whose @Catch()
 * matches, so PrismaExceptionFilter (registered first, in main.ts) still gets
 * first refusal on Prisma errors — this only sees whatever is left over.
 *
 * A 4xx HttpException (NotFoundException, ForbiddenException, ...) is a
 * normal business response, not a bug — those are not logged.
 */
@Catch()
export class ErrorLoggingFilter extends BaseExceptionFilter {
  constructor(
    applicationRef: AbstractHttpAdapter,
    private readonly errors: ErrorsService,
  ) {
    super(applicationRef);
  }

  async catch(exception: unknown, host: ArgumentsHost) {
    if (!this.isExpected(exception)) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      // Logging must never be the reason the real error response fails to go out.
      await this.errors
        .report({ source: 'backend', title: err.message || err.name, stack: err.stack ?? err.message })
        .catch(() => undefined);
    }
    super.catch(exception, host);
  }

  private isExpected(exception: unknown): boolean {
    return exception instanceof HttpException && exception.getStatus() < 500;
  }
}
