import { Reminder } from './reminder';

export abstract class ReminderRepository {
  /** Persiste o agregado e os eventos pendentes dele de forma atômica. */
  abstract save(reminder: Reminder): Promise<void>;
  abstract findById(id: string): Promise<Reminder | null>;
  abstract listByHolder(holderId: string): Promise<Reminder[]>;
}
