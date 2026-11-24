import { AttachmentProps, HealthRecord } from './health-record';

export abstract class HealthRecordRepository {
  /**
   * Persiste o registro e os eventos pendentes dele de forma atômica.
   * Devolve false, sem gravar nada, se o identificador já existe (envio repetido).
   */
  abstract create(record: HealthRecord): Promise<boolean>;
  /** Grava a correção de um registro existente. */
  abstract update(record: HealthRecord): Promise<void>;
  /** Remove o registro; os anexos saem junto (cascade). */
  abstract delete(id: string): Promise<void>;
  abstract addAttachment(recordId: string, attachment: AttachmentProps): Promise<void>;
  abstract findById(id: string): Promise<HealthRecord | null>;
  abstract listByHolder(holderId: string): Promise<HealthRecord[]>;
}
