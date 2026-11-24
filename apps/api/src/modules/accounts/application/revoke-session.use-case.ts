import { UseCase } from '../../../core/application/use-case';
import { NotFoundError } from '../../../core/domain/errors';
import { SessionRepository } from '../domain/session.repository';

export interface RevokeSessionInput {
  holderId: string;
  sessionId: string;
}

/**
 * Sair (a própria sessão) ou desvincular um aparelho perdido (ADR 04). A
 * sessão de outro titular responde como inexistente.
 */
export class RevokeSessionUseCase implements UseCase<RevokeSessionInput, void> {
  constructor(private readonly sessions: SessionRepository) {}

  async execute(input: RevokeSessionInput): Promise<void> {
    const session = await this.sessions.findById(input.sessionId);
    if (!session || !session.belongsTo(input.holderId)) {
      throw new NotFoundError('Sessão');
    }
    session.revoke();
    await this.sessions.save(session);
  }
}
