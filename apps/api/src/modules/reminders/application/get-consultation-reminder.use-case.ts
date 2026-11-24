import { UseCase } from '../../../core/application/use-case';
import { ReminderProps } from '../domain/reminder';
import { ReminderRepository } from '../domain/reminder.repository';

export class GetConsultationReminderUseCase
  implements UseCase<{ holderId: string; recordId: string }, ReminderProps | null>
{
  constructor(private readonly reminders: ReminderRepository) {}

  async execute(input: { holderId: string; recordId: string }): Promise<ReminderProps | null> {
    const reminder = await this.reminders.findByRecord(input.holderId, input.recordId);
    return reminder?.toSnapshot() ?? null;
  }
}
