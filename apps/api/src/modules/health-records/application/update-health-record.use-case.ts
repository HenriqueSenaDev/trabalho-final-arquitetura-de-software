import { UnitOfWork } from '../../../core/application/unit-of-work.port';
import { UseCase } from '../../../core/application/use-case';
import { NotFoundError } from '../../../core/domain/errors';
import { HealthRecordChanges } from '../domain/health-record';
import { HealthRecordRepository } from '../domain/health-record.repository';
import { ConsultationReminders } from './consultation-reminders.port';
import { HealthRecordWithReminder } from './create-health-record.use-case';

export interface UpdateHealthRecordInput extends HealthRecordChanges {
  holderId: string;
  recordId: string;
  /**
   * Ausente: mantém o aviso (numa remarcação, com a mesma antecedência).
   * `null`: cancela. Objeto: reagenda com essa antecedência.
   */
  reminder?: { minutesBefore: number } | null;
}

/**
 * Corrige ou remarca o registro e revisa o aviso na mesma transação. Toda
 * mudança no aviso gera uma nova versão do lembrete (ADR 03).
 */
export class UpdateHealthRecordUseCase
  implements UseCase<UpdateHealthRecordInput, HealthRecordWithReminder>
{
  constructor(
    private readonly records: HealthRecordRepository,
    private readonly reminders: ConsultationReminders,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(input: UpdateHealthRecordInput): Promise<HealthRecordWithReminder> {
    const now = new Date();
    const ref = { holderId: input.holderId, recordId: input.recordId };

    return this.unitOfWork.run(async () => {
      const current = await this.records.findById(input.recordId);
      if (!current || !current.belongsTo(input.holderId)) {
        throw new NotFoundError('Registro');
      }
      const corrected = current.correct(input, now);
      const reminder = await this.reminders.find(ref);
      const pending = reminder?.status === 'SCHEDULED' ? reminder : null;

      // undefined: o aviso não muda; null: cancelar; Date: (re)agendar.
      let remindAt: Date | null | undefined;
      if (input.reminder === null) {
        remindAt = null;
      } else if (input.reminder) {
        remindAt = corrected.reminderTimeFor(input.reminder.minutesBefore, now);
      } else if (pending && corrected.occurredAt.getTime() !== current.occurredAt.getTime()) {
        remindAt = corrected.keptReminderTime(current.minutesBefore(pending.remindAt), now);
      }

      await this.records.update(corrected);

      if (remindAt === null) {
        await this.reminders.cancel(ref);
      } else if (remindAt) {
        await this.reminders.schedule({ ...ref, title: corrected.title, remindAt });
      }
      return { ...corrected.toSnapshot(), reminder: await this.reminders.find(ref) };
    });
  }
}
