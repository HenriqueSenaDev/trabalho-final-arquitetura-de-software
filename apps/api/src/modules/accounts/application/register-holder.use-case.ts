import { UseCase } from '../../../core/application/use-case';
import { ConflictError, DomainError } from '../../../core/domain/errors';
import { Holder, PublicHolder } from '../domain/holder';
import { HolderRepository } from '../domain/holder.repository';
import { PasswordHasher } from './password-hasher.port';

export interface RegisterHolderInput {
  fullName: string;
  email: string;
  password: string;
}

const MIN_PASSWORD_LENGTH = 8;

export class RegisterHolderUseCase
  implements UseCase<RegisterHolderInput, PublicHolder>
{
  constructor(
    private readonly holders: HolderRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: RegisterHolderInput): Promise<PublicHolder> {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new DomainError(
        `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
    }

    const email = input.email.trim().toLowerCase();
    if (await this.holders.existsByEmail(email)) {
      throw new ConflictError('Já existe uma conta com este e-mail.');
    }

    const holder = Holder.register({
      fullName: input.fullName,
      email,
      passwordHash: await this.hasher.hash(input.password),
    });
    await this.holders.create(holder);
    return holder.toPublic();
  }
}
