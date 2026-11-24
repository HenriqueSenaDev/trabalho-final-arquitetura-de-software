import { UseCase } from '../../../core/application/use-case';
import { SessionRepository } from '../domain/session.repository';
import { AuthenticatedHolder } from './validate-session.use-case';

export interface ActiveSession {
  id: string;
  device: string;
  createdAt: Date;
  /** É a sessão que fez esta requisição. */
  current: boolean;
}

/** Aparelhos com sessão ativa do titular, para escolher qual revogar. */
export class ListSessionsUseCase implements UseCase<AuthenticatedHolder, ActiveSession[]> {
  constructor(private readonly sessions: SessionRepository) {}

  async execute(auth: AuthenticatedHolder): Promise<ActiveSession[]> {
    const sessions = await this.sessions.listActiveByHolder(auth.holderId);
    return sessions.map((session) => {
      const { id, device, createdAt } = session.toSnapshot();
      return { id, device, createdAt, current: id === auth.sessionId };
    });
  }
}
