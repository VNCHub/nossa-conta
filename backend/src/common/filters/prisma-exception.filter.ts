import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

/** Traduz erros conhecidos do Prisma para HTTP, sem vazar detalhe de schema. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    switch (exception.code) {
      case 'P2002':
        return super.catch(
          new ConflictException('Já existe um registro com esse valor.'),
          host,
        );
      case 'P2025':
        return super.catch(new NotFoundException('Registro não encontrado.'), host);
      default:
        return super.catch(exception, host);
    }
  }
}
