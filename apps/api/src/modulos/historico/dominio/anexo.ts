export interface DadosAnexo {
  id: string;
  exameId: string;
  nomeArquivo: string;
  tipoMime: string;
  tamanhoBytes: number;
  chaveArmazenamento: string;
  criadoEm: Date;
}

export class Anexo {
  private constructor(private readonly dados: DadosAnexo) {}

  static criar(dados: DadosAnexo): Anexo {
    return new Anexo({ ...dados });
  }

  get id(): string {
    return this.dados.id;
  }

  get exameId(): string {
    return this.dados.exameId;
  }

  get chaveArmazenamento(): string {
    return this.dados.chaveArmazenamento;
  }

  paraLeitura(): DadosAnexo {
    return { ...this.dados };
  }
}
