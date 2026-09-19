import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { ErrorsService } from '../../modules/errors/errors.service';

/** Maps known Prisma errors to HTTP, without leaking schema detail. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  constructor(
    applicationRef: AbstractHttpAdapter,
    private readonly errors: ErrorsService,
  ) {
    super(applicationRef);
  }

  async catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    switch (exception.code) {
      case 'P2002':
        return super.catch(
          new ConflictException('Já existe um registro com esse valor.'),
          host,
        );
      case 'P2025':
        return super.catch(new NotFoundException('Registro não encontrado.'), host);
      case 'P2004':
        // A CHECK constraint (e.g. Income's since/until ordering) — a business
        // rule violation the application layer should normally have already
        // caught, not an unexpected bug, so it skips the report below.
        return super.catch(
          new BadRequestException('Isso deixaria o registro num estado inválido.'),
          host,
        );
      default:
        // Anything else here is a Prisma error nobody anticipated — a real bug.
        await this.errors
          .report({ source: 'backend', title: exception.message, stack: exception.stack ?? exception.message })
          .catch(() => undefined);
        return super.catch(exception, host);
    }
  }
}
