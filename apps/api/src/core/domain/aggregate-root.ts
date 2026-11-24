import { IntegrationEvent } from '@personal-health/contracts';

/**
 * Raiz de agregado: acumula os eventos gerados pelas regras de negócio.
 * O repositório grava os eventos no outbox na mesma transação do agregado.
 */
export abstract class AggregateRoot {
  private readonly pendingEvents: IntegrationEvent[] = [];

  protected record(event: IntegrationEvent): void {
    this.pendingEvents.push(event);
  }

  pullEvents(): IntegrationEvent[] {
    return this.pendingEvents.splice(0, this.pendingEvents.length);
  }
}
