import { UseCase } from '../../../core/application/use-case';
import { DomainError } from '../../../core/domain/errors';
import {
  TIMELINE_ITEM_TYPES,
  TimelineFilter,
  TimelineItem,
  TimelinePosition,
  TimelineReader,
} from '../domain/timeline';

export const TIMELINE_PAGE_LIMIT = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface GetTimelineInput {
  filter: TimelineFilter;
  cursor?: string;
  limit?: number;
  /** Fuso do aparelho, para agrupar por mês como o titular vê o calendário. */
  timeZone?: string;
}

export interface TimelineMonth {
  month: string; // AAAA-MM
  items: TimelineItem[];
}

export interface TimelinePage {
  upcoming: TimelineItem[];
  past: TimelineMonth[];
  cursor: string | null;
}

/**
 * Linha do tempo (RF2): separa os acontecimentos futuros em "Próximos" e
 * agrupa os passados por mês, do mais recente para o mais antigo, com até
 * 50 itens por página.
 */
export class GetTimelineUseCase implements UseCase<GetTimelineInput, TimelinePage> {
  constructor(private readonly reader: TimelineReader) {}

  async execute(input: GetTimelineInput, now = new Date()): Promise<TimelinePage> {
    const limit = Math.min(Math.max(input.limit ?? TIMELINE_PAGE_LIMIT, 1), TIMELINE_PAGE_LIMIT);
    const after = input.cursor ? readCursor(input.cursor) : null;
    const monthOf = monthFormatter(input.timeZone ?? 'America/Fortaleza');

    // "Próximos" só na primeira página; as seguintes continuam o passado.
    const upcoming = after ? [] : await this.reader.upcoming(input.filter, now, limit);
    const past = await this.reader.past(input.filter, now, after, limit + 1);

    const page = past.slice(0, limit);
    const last = page.at(-1);
    return {
      upcoming,
      past: groupByMonth(page, monthOf),
      cursor: past.length > limit && last ? writeCursor(last) : null,
    };
  }
}

function groupByMonth(items: TimelineItem[], monthOf: (date: Date) => string): TimelineMonth[] {
  const months: TimelineMonth[] = [];
  for (const item of items) {
    const month = monthOf(item.date);
    const current = months.at(-1);
    if (current?.month === month) {
      current.items.push(item);
    } else {
      months.push({ month, items: [item] });
    }
  }
  return months;
}

function monthFormatter(timeZone: string): (date: Date) => string {
  try {
    const format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' });
    return (date) => format.format(date);
  } catch {
    throw new DomainError('Fuso horário inválido.');
  }
}

function writeCursor(item: TimelineItem): string {
  const position: TimelinePosition = { date: item.date, type: item.type, id: item.id };
  return Buffer.from(JSON.stringify(position)).toString('base64url');
}

function readCursor(cursor: string): TimelinePosition {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as Record<string, unknown>;
    const date = new Date(String(raw.date));
    const type = TIMELINE_ITEM_TYPES.find((value) => value === raw.type);
    const id = typeof raw.id === 'string' && UUID.test(raw.id) ? raw.id : null;
    if (Number.isNaN(date.getTime()) || !type || !id) {
      throw new Error('cursor incompleto');
    }
    return { date, type, id };
  } catch {
    throw new DomainError('Cursor de paginação inválido.');
  }
}
