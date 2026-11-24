import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../core/domain/errors';

export interface HolderProps {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export type PublicHolder = Omit<HolderProps, 'passwordHash'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Titular: a pessoa dona do histórico de saúde. */
export class Holder {
  private constructor(private readonly props: HolderProps) {}

  static register(
    input: { fullName: string; email: string; passwordHash: string },
    now = new Date(),
  ): Holder {
    const fullName = input.fullName.trim();
    const email = input.email.trim().toLowerCase();

    if (!fullName) {
      throw new DomainError('Informe o nome completo do titular.');
    }
    if (!EMAIL_PATTERN.test(email)) {
      throw new DomainError('Informe um e-mail válido.');
    }

    return new Holder({
      id: randomUUID(),
      fullName,
      email,
      passwordHash: input.passwordHash,
      createdAt: now,
    });
  }

  static restore(props: HolderProps): Holder {
    return new Holder({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  toSnapshot(): HolderProps {
    return { ...this.props };
  }

  toPublic(): PublicHolder {
    const { passwordHash: _passwordHash, ...rest } = this.props;
    return rest;
  }
}
