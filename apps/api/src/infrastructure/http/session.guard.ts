import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuditOutcome, AuditTrail } from '../../core/application/audit-trail.port';
import { NotFoundError } from '../../core/domain/errors';
import {
  AuthenticatedHolder,
  ValidateSessionUseCase,
} from '../../modules/accounts/application/validate-session.use-case';

export type AuthenticatedRequest = Request & { auth?: AuthenticatedHolder };

const IS_PUBLIC = 'is-public-route';

/** Rota acessível sem sessão: cadastro, login e verificação de saúde. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * Guarda global de sessão (ADR 04). Toda rota exige sessão válida, salvo as
 * marcadas com @Public. A identidade autenticada define o titular: nas rotas
 * `/holders/:holderId/...`, um `holderId` diferente do da sessão responde
 * como recurso inexistente, sem revelar se o outro titular existe.
 *
 * A guarda roda antes do interceptor de auditoria, então ela mesma registra
 * as tentativas negadas.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  private readonly logger = new Logger(SessionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly validateSession: ValidateSessionUseCase,
    private readonly audit: AuditTrail,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    const auth =
      scheme === 'Bearer' && token ? await this.validateSession.execute({ token }) : null;
    if (!auth) {
      await this.record(null, 'session.validate', 'DENIED', routePattern(request));
      throw new UnauthorizedException('Sessão inválida ou encerrada.');
    }

    const routeHolderId: unknown = request.params?.holderId;
    if (routeHolderId !== undefined && routeHolderId !== auth.holderId) {
      await this.record(auth.holderId, 'holder.access', 'DENIED', routePattern(request));
      throw new NotFoundError('Recurso');
    }

    request.auth = auth;
    return true;
  }

  private async record(
    holderId: string | null,
    action: string,
    outcome: AuditOutcome,
    reference: string,
  ): Promise<void> {
    try {
      await this.audit.record({ holderId, action, outcome, reference, at: new Date() });
    } catch (error) {
      this.logger.error(`Falha ao gravar auditoria: ${String(error)}`);
    }
  }
}

/** `GET /holders/:holderId/records/:recordId`: o padrão da rota, sem identificadores. */
function routePattern(request: Request): string {
  const path = (request.route as { path?: unknown } | undefined)?.path;
  return `${request.method} ${typeof path === 'string' ? path : request.path}`.slice(0, 120);
}

function authOf(context: ExecutionContext): AuthenticatedHolder {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.auth) {
    throw new UnauthorizedException('Sessão inválida ou encerrada.');
  }
  return request.auth;
}

/** Titular e sessão resolvidos pela guarda, nunca enviados pelo cliente. */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedHolder => authOf(context),
);
