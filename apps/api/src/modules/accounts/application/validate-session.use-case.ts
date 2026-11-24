import { UseCase } from '../../../core/application/use-case';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export interface AuthenticatedHolder {
  holderId: string;
  sessionId: string;
}

/** Usado pela guarda de sessão: token revogado ou desconhecido não autoriza nada. */
export class ValidateSessionUseCase
  implements UseCase<{ token: string }, AuthenticatedHolder | null>
{
  constructor(private readonly sessions: SessionRepository) {}

  async execute({ token }: { token: string }): Promise<AuthenticatedHolder | null> {
    const session = await this.sessions.findByTokenHash(Session.hashToken(token));
    if (!session || !session.isActive()) {
      return null;
    }
    return { holderId: session.holderId, sessionId: session.id };
  }
}
