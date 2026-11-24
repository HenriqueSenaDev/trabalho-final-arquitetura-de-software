import { EVENT_TYPES } from '@personal-health/contracts';
import { DomainError } from '../src/core/domain/errors';
import { Reminder } from '../src/modules/reminders/domain/reminder';

const holderId = '7f1d2c4e-0000-4000-8000-000000000001';
const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

describe('Lembretes: versões (ADR 03)', () => {
  it('reagendar cria nova versão e publica reminder.rescheduled com ela', () => {
    const reminder = Reminder.schedule({ holderId, title: 'Consulta', remindAt: inDays(1) });
    reminder.pullEvents();

    reminder.reschedule(inDays(3));

    expect(reminder.toSnapshot()).toMatchObject({ status: 'SCHEDULED', version: 2 });
    const [event] = reminder.pullEvents();
    expect(event.type).toBe(EVENT_TYPES.REMINDER_RESCHEDULED);
    expect(event.payload).toMatchObject({ reminderId: reminder.id, version: 2 });
  });

  it('cancelar também invalida a versão anterior', () => {
    const reminder = Reminder.schedule({ holderId, title: 'Consulta', remindAt: inDays(1) });
    reminder.pullEvents();

    reminder.cancel();

    expect(reminder.toSnapshot()).toMatchObject({ status: 'CANCELLED', version: 2 });
    expect(reminder.pullEvents()[0].payload).toMatchObject({ version: 2 });
  });

  it('um lembrete concluído pode ser reagendado; cancelIfScheduled não mexe nele', () => {
    const done = Reminder.restore({
      ...Reminder.schedule({ holderId, title: 'Consulta', remindAt: inDays(1) }).toSnapshot(),
      status: 'DONE',
      version: 4,
    });

    expect(done.cancelIfScheduled()).toBe(false);
    done.reschedule(inDays(10));
    expect(done.toSnapshot()).toMatchObject({ status: 'SCHEDULED', version: 5 });
    expect(done.loadedVersion).toBe(4);
  });

  it('não reagenda para o passado', () => {
    const reminder = Reminder.schedule({ holderId, title: 'Consulta', remindAt: inDays(1) });
    expect(() => reminder.reschedule(new Date(0))).toThrow(DomainError);
  });
});
