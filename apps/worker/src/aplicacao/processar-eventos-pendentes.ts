import { EventoDaOutbox, RepositorioOutbox, TratadorDeEvento } from '../portas/eventos';

export class DespachanteEventos {
  constructor(
    private readonly handlers: Partial<Record<EventoDaOutbox['tipo'], TratadorDeEvento>>,
  ) {}

  async despachar(evento: EventoDaOutbox): Promise<void> {
    const handler = this.handlers[evento.tipo];
    if (!handler) throw new Error(`Handler indisponível para ${evento.tipo}`);
    await handler.executar(evento);
  }
}

export class ProcessarEventosPendentes {
  constructor(
    readonly outbox: RepositorioOutbox,
    readonly despachante: DespachanteEventos,
  ) {}

  async executar(limite: number): Promise<void> {
    for (const evento of await this.outbox.reservarPendentes(limite)) {
      try {
        await this.despachante.despachar(evento);
        await this.outbox.marcarProcessado(evento.id);
      } catch {
        await this.outbox.registrarFalha(evento.id);
      }
    }
  }
}
