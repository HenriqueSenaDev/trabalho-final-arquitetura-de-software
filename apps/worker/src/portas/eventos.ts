export type TipoEvento =
  | 'ConsultationChanged'
  | 'ConsultationDeleted'
  | 'TreatmentChanged'
  | 'TreatmentEnded'
  | 'ReminderChanged'
  | 'ReminderCancelled';

export interface EventoDaOutbox {
  id: string;
  tipo: TipoEvento;
  origemId: string;
  titularId: string;
  versao: number;
  ocorridoEm: Date;
}

export type TratamentoAlterado = EventoDaOutbox & { tipo: 'TreatmentChanged' };

export interface RepositorioOutbox {
  salvar(evento: EventoDaOutbox): Promise<void>;
  reservarPendentes(limite: number): Promise<EventoDaOutbox[]>;
  marcarProcessado(eventoId: string): Promise<void>;
  registrarFalha(eventoId: string): Promise<void>;
}

export interface TratadorDeEvento {
  executar(evento: EventoDaOutbox): Promise<void>;
}
