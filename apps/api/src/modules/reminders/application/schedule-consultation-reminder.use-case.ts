import { UseCase } from '../../../core/application/use-case';
import { Reminder, ReminderProps } from '../domain/reminder';
import { ReminderRepository } from '../domain/reminder.repository';

export interface ScheduleConsultationReminderInput {
  holderId: string;
  recordId: string;
  title: string;
  remindAt: Date;
}

/**
 * Aviso da consulta: cria o lembrete na primeira vez e reagenda (nova
 * versão) nas seguintes. Chamado pelo módulo health-records dentro da
 * transação da consulta.
 */
export class ScheduleConsultationReminderUseCase
  implements UseCase<ScheduleConsultationReminderInput, ReminderProps>
{
  constructor(private readonly reminders: ReminderRepository) {}

  async execute(input: ScheduleConsultationReminderInput): Promise<ReminderProps> {
    const existing = await this.reminders.findByRecord(input.holderId, input.recordId);
    const reminder = existing ?? Reminder.schedule(input);
    if (existing) {
      existing.reschedule(input.remindAt);
    }
    await this.reminders.save(reminder);
    return reminder.toSnapshot();
  }
}
