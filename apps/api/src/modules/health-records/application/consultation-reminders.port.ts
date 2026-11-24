export type ConsultationReminderStatus = 'SCHEDULED' | 'CANCELLED' | 'DONE';

export interface ConsultationReminder {
  remindAt: Date;
  status: ConsultationReminderStatus;
  /** Cresce a cada remarcação ou cancelamento (ADR 03). */
  version: number;
}

/**
 * Porta para o módulo de lembretes: o aviso da consulta. Chamada dentro da
 * UnitOfWork da consulta, então consulta e aviso são confirmados juntos.
 */
export abstract class ConsultationReminders {
  /** Agenda o aviso; se a consulta já tem um, reagenda em nova versão. */
  abstract schedule(input: {
    holderId: string;
    recordId: string;
    title: string;
    remindAt: Date;
  }): Promise<ConsultationReminder>;

  /** Cancela o aviso pendente; sem aviso pendente, nada muda. */
  abstract cancel(input: { holderId: string; recordId: string }): Promise<void>;

  abstract find(input: { holderId: string; recordId: string }): Promise<ConsultationReminder | null>;
}
