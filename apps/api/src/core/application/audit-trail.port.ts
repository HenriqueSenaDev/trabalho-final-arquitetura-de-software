export type AuditOutcome = 'SUCCESS' | 'DENIED' | 'REJECTED' | 'ERROR';

/**
 * Entrada da trilha de auditoria (ADR 04): identidade, ação, resultado e
 * instante. A referência é só um identificador técnico, nunca conteúdo clínico.
 */
export interface AuditEntry {
  holderId: string | null;
  action: string;
  outcome: AuditOutcome;
  reference: string | null;
  at: Date;
}

export abstract class AuditTrail {
  abstract record(entry: AuditEntry): Promise<void>;
}
