import { UseCase } from '../../../core/application/use-case';
import { ReminderRepository } from '../domain/reminder.repository';

/** Cancela o aviso pendente da consulta (nova versão). Sem aviso pendente, nada muda. */
export class CancelConsultationReminderUseCase
  implements UseCase<{ holderId: string; recordId: string }, void>
{
  constructor(private readonly reminders: ReminderRepository) {}

  async execute(input: { holderId: string; recordId: string }): Promise<void> {
    const reminder = await this.reminders.findByRecord(input.holderId, input.recordId);
    if (reminder?.cancelIfScheduled()) {
      await this.reminders.save(reminder);
    }
  }
}
