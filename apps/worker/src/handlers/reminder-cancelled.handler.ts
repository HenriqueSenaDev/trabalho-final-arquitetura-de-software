import { EVENT_TYPES } from '@personal-health/contracts';
import { EventHandler } from './types';

export const onReminderCancelled: EventHandler<
  typeof EVENT_TYPES.REMINDER_CANCELLED
> = async (payload, tx) => {
  await tx.notificationDelivery.updateMany({
    where: { reminderId: payload.reminderId, status: 'RESERVED' },
    data: { status: 'CANCELLED' },
  });
};
