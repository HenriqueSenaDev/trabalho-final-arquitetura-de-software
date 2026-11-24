import { Injectable } from '@nestjs/common';
import { CancelConsultationReminderUseCase } from '../../reminders/application/cancel-consultation-reminder.use-case';
import { GetConsultationReminderUseCase } from '../../reminders/application/get-consultation-reminder.use-case';
import { ScheduleConsultationReminderUseCase } from '../../reminders/application/schedule-consultation-reminder.use-case';
import { ReminderProps } from '../../reminders/domain/reminder';
import {
  ConsultationReminder,
  ConsultationReminders,
} from '../application/consultation-reminders.port';

/** Adapter da porta ConsultationReminders sobre os casos de uso do módulo reminders. */
@Injectable()
export class RemindersModuleAdapter extends ConsultationReminders {
  constructor(
    private readonly scheduleReminder: ScheduleConsultationReminderUseCase,
    private readonly cancelReminder: CancelConsultationReminderUseCase,
    private readonly getReminder: GetConsultationReminderUseCase,
  ) {
    super();
  }

  async schedule(input: {
    holderId: string;
    recordId: string;
    title: string;
    remindAt: Date;
  }): Promise<ConsultationReminder> {
    return toPort(await this.scheduleReminder.execute(input));
  }

  cancel(input: { holderId: string; recordId: string }): Promise<void> {
    return this.cancelReminder.execute(input);
  }

  async find(input: { holderId: string; recordId: string }): Promise<ConsultationReminder | null> {
    const reminder = await this.getReminder.execute(input);
    return reminder ? toPort(reminder) : null;
  }
}

function toPort({ remindAt, status, version }: ReminderProps): ConsultationReminder {
  return { remindAt, status, version };
}
