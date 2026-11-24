import { DomainError } from '../src/core/domain/errors';
import { HealthRecord } from '../src/modules/health-records/domain/health-record';

const holderId = '7f1d2c4e-0000-4000-8000-000000000001';
const now = new Date('2026-11-24T12:00:00Z');

const consultation = (occurredAt: string, extra: object = {}) =>
  HealthRecord.create(
    { holderId, kind: 'CONSULTATION', title: 'Cardiologia', occurredAt: new Date(occurredAt), ...extra },
    now,
  );

describe('Consulta no histórico (RF1.1)', () => {
  it('aceita consulta passada ou futura; os demais registros só no passado', () => {
    expect(() => consultation('2026-03-10T13:00:00Z')).not.toThrow();
    expect(() => consultation('2026-12-10T13:00:00Z')).not.toThrow();
    expect(() =>
      HealthRecord.create(
        { holderId, kind: 'EXAM', title: 'Hemograma', occurredAt: new Date('2026-12-10T13:00:00Z') },
        now,
      ),
    ).toThrow(new DomainError('A data do registro não pode estar no futuro.'));
  });

  it('retorno precisa ser posterior à consulta e só existe em consulta', () => {
    expect(() =>
      consultation('2026-12-10T13:00:00Z', { followUpAt: new Date('2026-12-01T13:00:00Z') }),
    ).toThrow(new DomainError('O retorno precisa ser posterior à consulta.'));
    expect(() =>
      HealthRecord.create(
        {
          holderId,
          kind: 'VACCINE',
          title: 'Influenza',
          occurredAt: new Date('2026-10-01T13:00:00Z'),
          followUpAt: new Date('2027-10-01T13:00:00Z'),
        },
        now,
      ),
    ).toThrow(new DomainError('Só consultas têm retorno.'));
  });

  it('aviso só para consulta futura e nunca no passado', () => {
    const future = consultation('2026-12-01T09:00:00Z');
    expect(future.reminderTimeFor(24 * 60, now)).toEqual(new Date('2026-11-30T09:00:00Z'));
    expect(() => consultation('2026-03-10T13:00:00Z').reminderTimeFor(60, now)).toThrow(
      new DomainError('Só é possível pedir aviso para uma consulta futura.'),
    );
    expect(() => consultation('2026-11-24T12:30:00Z').reminderTimeFor(60, now)).toThrow(
      new DomainError('Com essa antecedência o aviso ficaria no passado.'),
    );
  });

  it('correção mantém identidade, titular, tipo e data de registro', () => {
    const original = consultation('2026-12-01T09:00:00Z', { location: 'Clínica A' });
    const corrected = original
      .correct({ occurredAt: new Date('2026-12-03T10:00:00Z'), location: null }, now)
      .toSnapshot();

    expect(corrected).toMatchObject({
      id: original.id,
      holderId,
      kind: 'CONSULTATION',
      occurredAt: new Date('2026-12-03T10:00:00Z'),
      location: null,
      createdAt: now,
    });
  });

  it('remarcação mantém a antecedência só se o aviso ainda couber no futuro', () => {
    expect(consultation('2026-12-05T14:00:00Z').keptReminderTime(24 * 60, now)).toEqual(
      new Date('2026-12-04T14:00:00Z'),
    );
    expect(consultation('2026-11-24T12:30:00Z').keptReminderTime(60, now)).toBeNull();
    expect(consultation('2026-12-05T14:00:00Z').minutesBefore(new Date('2026-12-05T13:00:00Z'))).toBe(60);
  });
});
