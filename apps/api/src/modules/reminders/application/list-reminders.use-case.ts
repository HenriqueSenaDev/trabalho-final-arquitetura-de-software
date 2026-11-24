import { UseCase } from '../../../core/application/use-case';
import { ReminderProps } from '../domain/reminder';
import { ReminderRepository } from '../domain/reminder.repository';

export class ListRemindersUseCase
  implements UseCase<{ holderId: string }, ReminderProps[]>
{
  constructor(private readonly reminders: ReminderRepository) {}

  async execute({ holderId }: { holderId: string }): Promise<ReminderProps[]> {
    const reminders = await this.reminders.listByHolder(holderId);
    return reminders.map((reminder) => reminder.toSnapshot());
  }
}
