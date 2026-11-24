import { HEALTH_RECORD_KINDS } from '../../health-records/domain/health-record';

/** Tipos de item: os do histórico, mais o retorno vinculado à consulta. */
export const TIMELINE_ITEM_TYPES = [...HEALTH_RECORD_KINDS, 'FOLLOW_UP'] as const;
export type TimelineItemType = (typeof TIMELINE_ITEM_TYPES)[number];

/** Item projetado a partir dos registros vigentes. `id` é o do registro de origem. */
export interface TimelineItem {
  type: TimelineItemType;
  id: string;
  date: Date;
  title: string;
  detail: string | null;
}

export interface TimelineFilter {
  holderId: string;
  types?: TimelineItemType[];
  from?: Date;
  to?: Date;
}

/** Posição para paginação por chave: data, tipo e identificador como desempate. */
export interface TimelinePosition {
  date: Date;
  type: TimelineItemType;
  id: string;
}

/**
 * Porta de leitura da linha do tempo (ADR 02). Consulta os registros
 * vigentes no momento da leitura, então um registro confirmado aparece na
 * próxima consulta. Se o custo de leitura crescer, um adapter com projeção
 * assíncrona pode substituir o atual sem mudar esta porta.
 */
export abstract class TimelineReader {
  /** Acontecimentos depois de `now`, do mais próximo para o mais distante. */
  abstract upcoming(filter: TimelineFilter, now: Date, limit: number): Promise<TimelineItem[]>;

  /** Acontecimentos até `now`, do mais recente para o mais antigo. */
  abstract past(
    filter: TimelineFilter,
    now: Date,
    after: TimelinePosition | null,
    limit: number,
  ): Promise<TimelineItem[]>;
}
