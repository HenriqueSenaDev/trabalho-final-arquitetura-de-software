/**
 * Contrato dos eventos que a API de Saúde grava no outbox e que o
 * Processador de eventos e lembretes consome. Toda mudança aqui é uma
 * mudança de contrato entre os dois contêineres.
 */
export const EVENT_TYPES = {
  REMINDER_SCHEDULED: 'reminder.scheduled',
  REMINDER_CANCELLED: 'reminder.cancelled',
  HEALTH_RECORD_CREATED: 'health-record.created',
  INDICATOR_RECORDED: 'indicator.recorded',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export interface ReminderScheduledPayload {
  reminderId: string;
  holderId: string;
  title: string;
  remindAt: string;
}

export interface ReminderCancelledPayload {
  reminderId: string;
  holderId: string;
}

export interface HealthRecordCreatedPayload {
  recordId: string;
  holderId: string;
  kind: string;
  occurredAt: string;
}

export interface IndicatorRecordedPayload {
  indicatorId: string;
  holderId: string;
  type: string;
  value: number;
  unit: string;
  measuredAt: string;
}

export interface EventPayloads {
  [EVENT_TYPES.REMINDER_SCHEDULED]: ReminderScheduledPayload;
  [EVENT_TYPES.REMINDER_CANCELLED]: ReminderCancelledPayload;
  [EVENT_TYPES.HEALTH_RECORD_CREATED]: HealthRecordCreatedPayload;
  [EVENT_TYPES.INDICATOR_RECORDED]: IndicatorRecordedPayload;
}

export interface IntegrationEvent<T extends EventType = EventType> {
  type: T;
  aggregateType: string;
  aggregateId: string;
  payload: EventPayloads[T];
  occurredAt: Date;
}
