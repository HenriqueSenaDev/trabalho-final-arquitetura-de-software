export interface TreatmentChanged {
  type: 'TreatmentChanged';
  originId: string;
  holderId: string;
  version: number;
  frequency: { type: 'FIXA'; intervalHours: number } | { type: 'SOB_DEMANDA' };
  startsAt: Date;
  endsAt: Date | null;
  initialTime: string | null;
  occurredAt: Date;
  eventId: string;
}

export interface TreatmentEnded {
  type: 'TreatmentEnded';
  originId: string;
  holderId: string;
  version: number;
  endedAt: Date;
  occurredAt: Date;
  eventId: string;
}

export type TreatmentEvent = TreatmentChanged | TreatmentEnded;

/**
 * Publication participates in the same UnitOfWork transaction as the
 * treatment write (transactional outbox). A real adapter must not use a
 * separate database connection.
 */
export abstract class PublicadorEventos {
  abstract publicar(evento: TreatmentEvent): Promise<void>;
}
