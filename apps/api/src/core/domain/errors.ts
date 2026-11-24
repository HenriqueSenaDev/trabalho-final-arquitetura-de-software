export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super(`${resource} não encontrado.`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/** E-mail ou senha não conferem; a mensagem não diz qual dos dois (401). */
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('E-mail ou senha inválidos.');
    this.name = 'InvalidCredentialsError';
  }
}
