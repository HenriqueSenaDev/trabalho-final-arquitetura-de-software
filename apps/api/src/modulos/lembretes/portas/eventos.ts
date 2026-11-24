import { EventoLembretes } from '../contrato';

export abstract class PublicadorEventos {
  abstract publicar(evento: EventoLembretes): Promise<void>;
}

export abstract class RepositorioOutbox {
  abstract salvar(evento: EventoLembretes): Promise<void>;

  abstract reservarPendentes(limite: number): Promise<EventoLembretes[]>;

  abstract marcarProcessado(eventoId: string): Promise<void>;

  abstract registrarFalha(eventoId: string): Promise<void>;
}
