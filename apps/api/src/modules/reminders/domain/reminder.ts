import { randomUUID } from 'node:crypto';
import { EVENT_TYPES } from '@personal-health/contracts';
import { AggregateRoot } from '../../../core/domain/aggregate-root';
import { DomainError } from '../../../core/domain/errors';

export type ReminderStatus = 'SCHEDULED' | 'CANCELLED' | 'DONE';

export interface ReminderProps {
  id: string;
  holderId: string;
  /** Consulta de origem, quando o lembrete é o aviso de uma consulta. */
  recordId: string | null;
  title: string;
  notes: string | null;
  remindAt: Date;
  status: ReminderStatus;
  /** Reagendar ou cancelar gera uma nova versão; só a vigente é entregue (ADR 03). */
  version: number;
  createdAt: Date;
}

export interface ScheduleReminderProps {
  holderId: string;
  recordId?: string | null;
  title: string;
  notes?: string | null;
  remindAt: Date;
}

export class Reminder extends AggregateRoot {
  private constructor(
    private props: ReminderProps,
    /** Versão lida do banco; null para um lembrete novo. */
    readonly loadedVersion: number | null,
  ) {
    super();
  }

  static schedule(input: ScheduleReminderProps, now = new Date()): Reminder {
    const title = input.title.trim();
    if (!title) {
      throw new DomainError('O lembrete precisa de um título.');
    }
    assertFuture(input.remindAt, now);

    const reminder = new Reminder(
      {
        id: randomUUID(),
        holderId: input.holderId,
        recordId: input.recordId ?? null,
        title,
        notes: input.notes ?? null,
        remindAt: input.remindAt,
        status: 'SCHEDULED',
        version: 1,
        createdAt: now,
      },
      null,
    );

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
        version: reminder.version,
      },
    });

    return reminder;
  }

  static restore(props: ReminderProps): Reminder {
    return new Reminder({ ...props }, props.version);
  }

  /**
   * Novo horário: nova versão agendada. Vale também para um lembrete já
   * concluído ou cancelado. A versão anterior deixa de ser entregue.
   */
  reschedule(remindAt: Date, now = new Date()): void {
    assertFuture(remindAt, now);
    this.props.remindAt = remindAt;
    this.props.status = 'SCHEDULED';
    this.props.version += 1;
    this.record({
      type: EVENT_TYPES.REMINDER_RESCHEDULED,
      aggregateType: 'reminder',
      aggregateId: this.id,
      occurredAt: now,
      payload: {
        reminderId: this.id,
        holderId: this.holderId,
        remindAt: remindAt.toISOString(),
        version: this.props.version,
      },
    });
  }

  cancel(now = new Date()): void {
    if (this.props.status !== 'SCHEDULED') {
      throw new DomainError('Apenas lembretes agendados podem ser cancelados.');
    }
    this.props.status = 'CANCELLED';
    this.props.version += 1;
    this.record({
      type: EVENT_TYPES.REMINDER_CANCELLED,
      aggregateType: 'reminder',
      aggregateId: this.id,
      occurredAt: now,
      payload: { reminderId: this.id, holderId: this.holderId, version: this.props.version },
    });
  }

  /** Para a consulta excluída ou sem aviso: cancela só o que ainda não saiu. */
  cancelIfScheduled(now = new Date()): boolean {
    if (this.props.status !== 'SCHEDULED') {
      return false;
    }
    this.cancel(now);
    return true;
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

  get version(): number {
    return this.props.version;
  }

  toSnapshot(): ReminderProps {
    return { ...this.props };
  }
}

function assertFuture(remindAt: Date, now: Date): void {
  if (remindAt.getTime() <= now.getTime()) {
    throw new DomainError('O lembrete precisa ser agendado para o futuro.');
  }
}
