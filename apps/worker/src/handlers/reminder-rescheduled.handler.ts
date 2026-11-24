import { EVENT_TYPES } from '@personal-health/contracts';
import { EventHandler } from './types';

/**
 * Novo horário (ADR 03): os avisos reservados de versões anteriores são
 * cancelados e a nova versão ganha o seu. Mesmo antes deste evento ser
 * processado, o dispatcher já não entrega a versão antiga, porque revalida a
 * versão do lembrete antes do envio.
 */
export const onReminderRescheduled: EventHandler<
  typeof EVENT_TYPES.REMINDER_RESCHEDULED
> = async (payload, tx) => {
  await tx.notificationDelivery.updateMany({
    where: { reminderId: payload.reminderId, status: 'RESERVED', version: { lt: payload.version } },
    data: { status: 'CANCELLED' },
  });
  await tx.notificationDelivery.createMany({
    data: [
      {
        reminderId: payload.reminderId,
        version: payload.version,
        scheduledFor: new Date(payload.remindAt),
      },
    ],
    skipDuplicates: true,
  });
};
