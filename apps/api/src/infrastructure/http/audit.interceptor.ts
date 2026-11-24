import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { catchError, from, map, mergeMap, Observable, throwError } from 'rxjs';
import { AuditOutcome, AuditTrail } from '../../core/application/audit-trail.port';
import {
  DomainError,
  InvalidCredentialsError,
  NotFoundError,
} from '../../core/domain/errors';
import { AuthenticatedRequest } from './session.guard';

const AUDIT_ACTION = 'audit-action';

/** Marca a rota para a trilha de auditoria com o nome da ação. */
export const Audit = (action: string) => SetMetadata(AUDIT_ACTION, action);

/** Parâmetros de rota que identificam o objeto da ação, em ordem de preferência. */
const REFERENCE_PARAMS = ['recordId', 'reminderId', 'sessionId', 'attachmentId'];

/**
 * Registra identidade, ação, resultado e instante das rotas marcadas com
 * @Audit (ADR 04). Não copia corpo nem resposta: a referência é só o
 * identificador técnico do objeto.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditTrail,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string | undefined>(AUDIT_ACTION, context.getHandler());
    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const fromRoute =
      REFERENCE_PARAMS.map((name) => request.params?.[name]).find(
        (value): value is string => typeof value === 'string' && value.length > 0,
      ) ?? null;

    const record = (outcome: AuditOutcome, response?: unknown) =>
      this.audit
        .record({
          holderId: request.auth?.holderId ?? holderIdFrom(response),
          action,
          outcome,
          reference: fromRoute ?? idFrom(response),
          at: new Date(),
        })
        .catch((error: unknown) =>
          this.logger.error(`Falha ao gravar auditoria de ${action}: ${String(error)}`),
        );

    return next.handle().pipe(
      mergeMap((response) => from(record('SUCCESS', response)).pipe(map(() => response))),
      catchError((error: unknown) =>
        from(record(outcomeOf(error))).pipe(mergeMap(() => throwError(() => error))),
      ),
    );
  }
}

function outcomeOf(error: unknown): AuditOutcome {
  if (error instanceof NotFoundError || error instanceof InvalidCredentialsError) return 'DENIED';
  if (error instanceof DomainError) return 'REJECTED';
  if (error instanceof HttpException && error.getStatus() < 500) {
    return error.getStatus() === 401 || error.getStatus() === 404 ? 'DENIED' : 'REJECTED';
  }
  return 'ERROR';
}

function idFrom(response: unknown): string | null {
  const id = (response as { id?: unknown } | null | undefined)?.id;
  return typeof id === 'string' ? id : null;
}

/** No login, a identidade só existe na resposta. */
function holderIdFrom(response: unknown): string | null {
  const holder = (response as { holder?: { id?: unknown } } | null | undefined)?.holder;
  return typeof holder?.id === 'string' ? holder.id : null;
}
