import { EVENT_TYPES } from '@personal-health/contracts';
import { EventHandler } from './types';

/**
 * Reserva o aviso do lembrete. A chave única (reminderId, scheduledFor)
 * torna o handler idempotente: reprocessar o mesmo evento não duplica avisos.
 */
export const onReminderScheduled: EventHandler<
  typeof EVENT_TYPES.REMINDER_SCHEDULED
> = async (payload, tx) => {
  await tx.notificationDelivery.createMany({
    data: [
      {
        reminderId: payload.reminderId,
        scheduledFor: new Date(payload.remindAt),
      },
    ],
    skipDuplicates: true,
  });
};
