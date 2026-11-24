import { randomUUID } from 'node:crypto';
import { EVENT_TYPES } from '@personal-health/contracts';
import { AggregateRoot } from '../../../core/domain/aggregate-root';
import { DomainError } from '../../../core/domain/errors';

export type ReminderStatus = 'SCHEDULED' | 'CANCELLED' | 'DONE';

export interface ReminderProps {
  id: string;
  holderId: string;
  title: string;
  notes: string | null;
  remindAt: Date;
  status: ReminderStatus;
  createdAt: Date;
}

export interface ScheduleReminderProps {
  holderId: string;
  title: string;
  notes?: string | null;
  remindAt: Date;
}

export class Reminder extends AggregateRoot {
  private constructor(private props: ReminderProps) {
    super();
  }

  static schedule(input: ScheduleReminderProps, now = new Date()): Reminder {
    const title = input.title.trim();
    if (!title) {
      throw new DomainError('O lembrete precisa de um título.');
    }
    if (input.remindAt.getTime() <= now.getTime()) {
      throw new DomainError('O lembrete precisa ser agendado para o futuro.');
    }

    const reminder = new Reminder({
      id: randomUUID(),
      holderId: input.holderId,
      title,
      notes: input.notes ?? null,
      remindAt: input.remindAt,
      status: 'SCHEDULED',
      createdAt: now,
    });

    reminder.record({
      type: EVENT_TYPES.REMINDER_SCHEDULED,
      aggregateType: 'reminder',
      aggregateId: reminder.id,
      occurredAt: now,
      payload: {
        reminderId: reminder.id,
        holderId: reminder.holderId,
        title: reminder.title,
        remindAt: reminder.remindAt.toISOString(),
      },
    });

    return reminder;
  }

  static restore(props: ReminderProps): Reminder {
    return new Reminder({ ...props });
  }

  cancel(now = new Date()): void {
    if (this.props.status !== 'SCHEDULED') {
      throw new DomainError('Apenas lembretes agendados podem ser cancelados.');
    }
    this.props.status = 'CANCELLED';
    this.record({
      type: EVENT_TYPES.REMINDER_CANCELLED,
      aggregateType: 'reminder',
      aggregateId: this.id,
      occurredAt: now,
      payload: { reminderId: this.id, holderId: this.holderId },
    });
  }

  belongsTo(holderId: string): boolean {
    return this.props.holderId === holderId;
  }

  get id(): string {
    return this.props.id;
  }

  get holderId(): string {
    return this.props.holderId;
  }

  get title(): string {
    return this.props.title;
  }

  get remindAt(): Date {
    return this.props.remindAt;
  }

  toSnapshot(): ReminderProps {
    return { ...this.props };
  }
}
