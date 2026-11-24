import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ConflictError,
  DomainError,
  InvalidCredentialsError,
  NotFoundError,
} from '../../core/domain/errors';

/** Traduz erros de domínio para respostas HTTP na borda da aplicação. */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      error instanceof NotFoundError
        ? HttpStatus.NOT_FOUND
        : error instanceof ConflictError
          ? HttpStatus.CONFLICT
          : error instanceof InvalidCredentialsError
            ? HttpStatus.UNAUTHORIZED
            : HttpStatus.UNPROCESSABLE_ENTITY;

    response.status(status).json({ statusCode: status, message: error.message });
  }
}
