export interface SignedUrl {
  url: string;
  expiresAt: Date;
}

/** Porta para o Armazenamento de anexos (arquivos privados de exames). */
export abstract class AttachmentStorage {
  abstract createUploadUrl(key: string, mimeType: string): Promise<SignedUrl>;
  abstract createDownloadUrl(key: string): Promise<SignedUrl>;
}
