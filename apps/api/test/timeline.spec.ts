import { DomainError } from '../src/core/domain/errors';
import { GetTimelineUseCase } from '../src/modules/timeline/application/get-timeline.use-case';
import {
  TimelineFilter,
  TimelineItem,
  TimelinePosition,
  TimelineReader,
} from '../src/modules/timeline/domain/timeline';

const holderId = '7f1d2c4e-0000-4000-8000-000000000001';
const now = new Date('2026-11-24T12:00:00Z');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Mesma ordenação do adapter SQL: (data, tipo, id). */
class InMemoryTimelineReader extends TimelineReader {
  constructor(private readonly items: TimelineItem[]) {
    super();
  }

  async upcoming(_filter: TimelineFilter, at: Date, limit: number): Promise<TimelineItem[]> {
    return this.items.filter((item) => item.date > at).sort((a, b) => compare(a, b)).slice(0, limit);
  }

  async past(
    _filter: TimelineFilter,
    at: Date,
    after: TimelinePosition | null,
    limit: number,
  ): Promise<TimelineItem[]> {
    return this.items
      .filter((item) => item.date <= at && (!after || compare(item, after) < 0))
      .sort((a, b) => compare(b, a))
      .slice(0, limit);
  }
}

function compare(a: TimelinePosition, b: TimelinePosition): number {
  return (
    a.date.getTime() - b.date.getTime() || a.type.localeCompare(b.type) || a.id.localeCompare(b.id)
  );
}

const item = (n: number, date: string, type: TimelineItem['type'] = 'CONSULTATION'): TimelineItem => ({
  type,
  id: id(n),
  date: new Date(date),
  title: `Item ${n}`,
  detail: null,
});

describe('Linha do tempo (RF2, ADR 02)', () => {
  it('separa Próximos e agrupa os passados por mês, do mais recente para o mais antigo', async () => {
    const reader = new InMemoryTimelineReader([
      item(1, '2026-12-01T12:00:00Z'),
      item(2, '2027-01-10T12:00:00Z', 'FOLLOW_UP'),
      item(3, '2026-11-02T12:00:00Z', 'EXAM'),
      item(4, '2026-10-15T12:00:00Z', 'VACCINE'),
      item(5, '2026-10-01T12:00:00Z'),
    ]);

    const page = await new GetTimelineUseCase(reader).execute({ filter: { holderId } }, now);

    expect(page.upcoming.map((i) => i.id)).toEqual([id(1), id(2)]);
    expect(page.past.map((m) => [m.month, m.items.map((i) => i.id)])).toEqual([
      ['2026-11', [id(3)]],
      ['2026-10', [id(4), id(5)]],
    ]);
    expect(page.cursor).toBeNull();
  });

  it('pagina o passado por cursor sem repetir nem pular itens', async () => {
    const items = Array.from({ length: 5 }, (_, n) =>
      item(n + 1, `2026-0${n + 1}-10T12:00:00Z`),
    );
    const useCase = new GetTimelineUseCase(new InMemoryTimelineReader(items));

    const first = await useCase.execute({ filter: { holderId }, limit: 3 }, now);
    const second = await useCase.execute({ filter: { holderId }, limit: 3, cursor: first.cursor! }, now);

    const ids = [...first.past, ...second.past].flatMap((m) => m.items.map((i) => i.id));
    expect(ids).toEqual([id(5), id(4), id(3), id(2), id(1)]);
    expect(second.upcoming).toEqual([]);
    expect(second.cursor).toBeNull();
  });

  it('cursor ou fuso inválidos são recusados', async () => {
    const useCase = new GetTimelineUseCase(new InMemoryTimelineReader([]));
    await expect(useCase.execute({ filter: { holderId }, cursor: 'lixo' }, now)).rejects.toThrow(
      new DomainError('Cursor de paginação inválido.'),
    );
    await expect(
      useCase.execute({ filter: { holderId }, timeZone: 'Marte/Olympus' }, now),
    ).rejects.toThrow(new DomainError('Fuso horário inválido.'));
  });
});
