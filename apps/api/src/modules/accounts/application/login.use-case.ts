import { UseCase } from '../../../core/application/use-case';
import { InvalidCredentialsError } from '../../../core/domain/errors';
import { PublicHolder } from '../domain/holder';
import { HolderRepository } from '../domain/holder.repository';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { PasswordHasher } from './password-hasher.port';

export interface LoginInput {
  email: string;
  password: string;
  device?: string;
  deliveryToken?: string;
}

export interface LoginOutput {
  token: string;
  sessionId: string;
  holder: PublicHolder;
}

/** Abre uma sessão para o aparelho e registra o destino de notificações dele. */
export class LoginUseCase implements UseCase<LoginInput, LoginOutput> {
  constructor(
    private readonly holders: HolderRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const holder = await this.holders.findByEmail(input.email);
    const passwordHash = holder?.toSnapshot().passwordHash;
    if (!holder || !passwordHash || !(await this.hasher.verify(input.password, passwordHash))) {
      throw new InvalidCredentialsError();
    }

    const { session, token } = Session.open({
      holderId: holder.id,
      device: input.device,
      deliveryToken: input.deliveryToken,
    });
    await this.sessions.save(session);
    return { token, sessionId: session.id, holder: holder.toPublic() };
  }
}
