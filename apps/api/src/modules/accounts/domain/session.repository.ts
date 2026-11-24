import { Session } from './session';

export abstract class SessionRepository {
  abstract save(session: Session): Promise<void>;
  abstract findByTokenHash(tokenHash: string): Promise<Session | null>;
  abstract findById(id: string): Promise<Session | null>;
  abstract listActiveByHolder(holderId: string): Promise<Session[]>;
}
