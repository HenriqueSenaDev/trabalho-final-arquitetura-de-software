export type ResultadoAuditado = 'SUCESSO' | 'NEGADO' | 'RECUSADO' | 'ERRO';

/**
 * ADR 04: a trilha registra identidade, ação, resultado e instante. A
 * referência é sempre um identificador técnico, nunca conteúdo clínico.
 */
export interface EntradaDeAuditoria {
  identidade: string | null;
  acao: string;
  resultado: ResultadoAuditado;
  referencia: string | null;
  instante: Date;
}

/** Porta de saída para a trilha de auditoria. */
export abstract class TrilhaDeAuditoria {
  abstract registrar(entrada: EntradaDeAuditoria): Promise<void>;
}
