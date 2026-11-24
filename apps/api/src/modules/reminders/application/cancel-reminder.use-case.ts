import { UseCase } from '../../../core/application/use-case';
import { NotFoundError } from '../../../core/domain/errors';
import { ReminderProps } from '../domain/reminder';
import { ReminderRepository } from '../domain/reminder.repository';

export interface CancelReminderInput {
  holderId: string;
  reminderId: string;
}

export class CancelReminderUseCase
  implements UseCase<CancelReminderInput, ReminderProps>
{
  constructor(private readonly reminders: ReminderRepository) {}

  async execute(input: CancelReminderInput): Promise<ReminderProps> {
    const reminder = await this.reminders.findById(input.reminderId);
    if (!reminder || !reminder.belongsTo(input.holderId)) {
      throw new NotFoundError('Lembrete');
    }

    reminder.cancel();
    await this.reminders.save(reminder);
    return reminder.toSnapshot();
  }
}
