export interface DadosTitular {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
}

/** Titular: a pessoa dona do histórico. O cadastro fica fora deste fluxo. */
export class Titular {
  private constructor(private readonly dados: DadosTitular) {}

  static restaurar(dados: DadosTitular): Titular {
    return new Titular({ ...dados });
  }

  get id(): string {
    return this.dados.id;
  }

  get nome(): string {
    return this.dados.nome;
  }

  get senhaHash(): string {
    return this.dados.senhaHash;
  }
}
