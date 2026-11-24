/**
 * Erros que o núcleo (domínio e casos de uso) pode lançar. Não dependem de
 * HTTP: quem traduz cada um para um status é a Entrada HTTP.
 */
export abstract class ErroDeDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
  }
}

/** O comando viola uma regra de negócio (a Entrada HTTP responde 422). */
export class RegraVioladaErro extends ErroDeDominio {}

/**
 * O recurso não existe ou pertence a outro titular. As duas situações têm a
 * mesma resposta para não revelar a existência de dados alheios (ADR 04).
 */
export class RecursoIndisponivelErro extends ErroDeDominio {
  constructor() {
    super('Recurso indisponível.');
  }
}

/**
 * O registro mudou entre a leitura e a gravação, ou o identificador enviado
 * pelo cliente já pertence a outro registro (a Entrada HTTP responde 409).
 */
export class ConflitoErro extends ErroDeDominio {}

/** E-mail ou senha não conferem. A mensagem não diz qual dos dois falhou. */
export class CredenciaisInvalidasErro extends ErroDeDominio {
  constructor() {
    super('E-mail ou senha incorretos.');
  }
}

/**
 * A funcionalidade ou método ainda não está disponível/implementado (a Entrada HTTP responde 503).
 */
export class FuncionalidadeIndisponivelErro extends ErroDeDominio {
  constructor(mensagem = 'Funcionalidade temporariamente indisponível.') {
    super(mensagem);
  }
}
