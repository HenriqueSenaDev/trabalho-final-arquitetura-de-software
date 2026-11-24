import { IntegrationEvent } from '@personal-health/contracts';
import { Prisma } from '@personal-health/database';

/**
 * Converte eventos de domínio em linhas do outbox. Deve ser usado dentro da
 * mesma transação que persiste o agregado, para garantir que nenhum evento
 * seja publicado sem a escrita correspondente (e vice-versa).
 */
export function toOutboxRows(
  events: IntegrationEvent[],
): Prisma.OutboxEventCreateManyInput[] {
  return events.map((event) => ({
    type: event.type,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload as unknown as Prisma.InputJsonValue,
    occurredAt: event.occurredAt,
  }));
}
