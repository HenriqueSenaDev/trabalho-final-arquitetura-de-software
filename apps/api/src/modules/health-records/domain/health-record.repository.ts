import { AttachmentProps, HealthRecord } from './health-record';

export abstract class HealthRecordRepository {
  /** Persiste o registro e os eventos pendentes dele de forma atômica. */
  abstract create(record: HealthRecord): Promise<void>;
  abstract addAttachment(recordId: string, attachment: AttachmentProps): Promise<void>;
  abstract findById(id: string): Promise<HealthRecord | null>;
  abstract listByHolder(holderId: string): Promise<HealthRecord[]>;
}
