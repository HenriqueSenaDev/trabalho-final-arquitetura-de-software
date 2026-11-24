import { EventPayloads, EventType } from '@personal-health/contracts';
import { Prisma } from '@personal-health/database';

export type EventHandler<T extends EventType> = (
  payload: EventPayloads[T],
  tx: Prisma.TransactionClient,
) => Promise<void>;

export type EventHandlers = { [T in EventType]: EventHandler<T> };
