import { Reminder } from './reminder';

export abstract class ReminderRepository {
  /**
   * Persiste o agregado e os eventos pendentes dele de forma atômica. Ao
   * gravar uma nova versão, falha com ConflictError se outra operação mudou
   * o lembrete desde a leitura.
   */
  abstract save(reminder: Reminder): Promise<void>;
  abstract findById(id: string): Promise<Reminder | null>;
  abstract listByHolder(holderId: string): Promise<Reminder[]>;
  /** Aviso da consulta, sempre por titular. */
  abstract findByRecord(holderId: string, recordId: string): Promise<Reminder | null>;
}
