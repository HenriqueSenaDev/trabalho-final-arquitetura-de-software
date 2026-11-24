import { EVENT_TYPES, EventType } from '@personal-health/contracts';
import { Prisma } from '@personal-health/database';
import { logger } from '../logger';
import { onReminderCancelled } from './reminder-cancelled.handler';
import { onReminderRescheduled } from './reminder-rescheduled.handler';
import { onReminderScheduled } from './reminder-scheduled.handler';
import { EventHandlers } from './types';

const handlers: EventHandlers = {
  [EVENT_TYPES.REMINDER_SCHEDULED]: onReminderScheduled,
  [EVENT_TYPES.REMINDER_RESCHEDULED]: onReminderRescheduled,
  [EVENT_TYPES.REMINDER_CANCELLED]: onReminderCancelled,
  // Ainda sem reação assíncrona; registrados para o evento sair do outbox.
  [EVENT_TYPES.HEALTH_RECORD_CREATED]: async () => undefined,
  [EVENT_TYPES.INDICATOR_RECORDED]: async () => undefined,
};

function isKnownEvent(type: string): type is EventType {
  return type in handlers;
}

export async function dispatchEvent(
  type: string,
  payload: unknown,
  tx: Prisma.TransactionClient,
): Promise<void> {
  if (!isKnownEvent(type)) {
    logger.warn('Evento sem handler; marcado como processado', { type });
    return;
  }
  const handler = handlers[type] as (p: unknown, t: Prisma.TransactionClient) => Promise<void>;
  await handler(payload, tx);
}
