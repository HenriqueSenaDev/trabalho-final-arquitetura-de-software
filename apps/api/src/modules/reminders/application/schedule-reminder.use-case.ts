import { UseCase } from '../../../core/application/use-case';
import { Reminder, ReminderProps } from '../domain/reminder';
import { ReminderRepository } from '../domain/reminder.repository';

export interface ScheduleReminderInput {
  holderId: string;
  title: string;
  notes?: string;
  remindAt: Date;
}

export class ScheduleReminderUseCase
  implements UseCase<ScheduleReminderInput, ReminderProps>
{
  constructor(private readonly reminders: ReminderRepository) {}

  async execute(input: ScheduleReminderInput): Promise<ReminderProps> {
    const reminder = Reminder.schedule(input);
    await this.reminders.save(reminder);
    return reminder.toSnapshot();
  }
}
