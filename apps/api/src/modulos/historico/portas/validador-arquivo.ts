import { ArquivoAnexo } from './armazenamento-anexos';

export const TIPOS_MIME_ANEXO = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAXIMO_ANEXOS_POR_EXAME = 5;
export const TAMANHO_MAXIMO_ANEXO_BYTES = 10 * 1024 * 1024;

export abstract class ValidadorArquivo {
  abstract validar(arquivo: ArquivoAnexo): Promise<void>;
}
