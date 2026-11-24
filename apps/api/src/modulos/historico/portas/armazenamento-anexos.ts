export interface ArquivoAnexo {
  nomeArquivo: string;
  tipoMime: string;
  tamanhoBytes: number;
  conteudo?: Uint8Array;
}

export interface ReferenciaArquivo {
  chaveArmazenamento: string;
}

export abstract class ArmazenamentoAnexos {
  abstract armazenar(arquivo: ArquivoAnexo): Promise<ReferenciaArquivo>;
  abstract recuperar(chave: string): Promise<Uint8Array>;
  abstract excluir(chave: string): Promise<void>;
}
