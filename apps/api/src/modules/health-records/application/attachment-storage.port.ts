export interface SignedUrl {
  url: string;
  expiresAt: Date;
}

/** Porta para o Armazenamento de anexos (arquivos privados de exames). */
export abstract class AttachmentStorage {
  abstract createUploadUrl(key: string, mimeType: string): Promise<SignedUrl>;
  abstract createDownloadUrl(key: string): Promise<SignedUrl>;
  /**
   * Remove os arquivos de um registro excluído. Melhor esforço: o registro já
   * saiu do banco, e um arquivo órfão no bucket privado não fica acessível.
   */
  abstract deleteObjects(keys: string[]): Promise<void>;
}
