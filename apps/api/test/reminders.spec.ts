import { EVENT_TYPES } from '@personal-health/contracts';
import { DomainError, NotFoundError } from '../src/core/domain/errors';
import { CancelReminderUseCase } from '../src/modules/reminders/application/cancel-reminder.use-case';
import { ScheduleReminderUseCase } from '../src/modules/reminders/application/schedule-reminder.use-case';
import { Reminder } from '../src/modules/reminders/domain/reminder';
import { ReminderRepository } from '../src/modules/reminders/domain/reminder.repository';

class InMemoryReminderRepository extends ReminderRepository {
  readonly items = new Map<string, Reminder>();
  readonly published: string[] = [];

  async save(reminder: Reminder): Promise<void> {
    this.items.set(reminder.id, reminder);
    this.published.push(...reminder.pullEvents().map((event) => event.type));
  }

  async findById(id: string): Promise<Reminder | null> {
    return this.items.get(id) ?? null;
  }

  async listByHolder(holderId: string): Promise<Reminder[]> {
    return [...this.items.values()].filter((item) => item.belongsTo(holderId));
  }

  async findByRecord(holderId: string, recordId: string): Promise<Reminder | null> {
    return (
      [...this.items.values()].find(
        (item) => item.belongsTo(holderId) && item.toSnapshot().recordId === recordId,
      ) ?? null
    );
  }
}

const holderId = '7f1d2c4e-0000-4000-8000-000000000001';
const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

describe('Lembretes', () => {
  it('agendar um lembrete publica reminder.scheduled no outbox', async () => {
    const repo = new InMemoryReminderRepository();
    const reminder = await new ScheduleReminderUseCase(repo).execute({
      holderId,
      title: 'Tomar vacina',
      remindAt: tomorrow(),
    });

    expect(reminder.status).toBe('SCHEDULED');
    expect(repo.published).toEqual([EVENT_TYPES.REMINDER_SCHEDULED]);
  });

  it('recusa lembrete no passado', () => {
    expect(() =>
      Reminder.schedule({ holderId, title: 'Atrasado', remindAt: new Date(0) }),
    ).toThrow(DomainError);
  });

  it('cancelar publica reminder.cancelled e não cancela duas vezes', async () => {
    const repo = new InMemoryReminderRepository();
    const created = await new ScheduleReminderUseCase(repo).execute({
      holderId,
      title: 'Consulta',
      remindAt: tomorrow(),
    });
    const cancel = new CancelReminderUseCase(repo);

    await cancel.execute({ holderId, reminderId: created.id });
    expect(repo.published).toEqual([
      EVENT_TYPES.REMINDER_SCHEDULED,
      EVENT_TYPES.REMINDER_CANCELLED,
    ]);
    await expect(cancel.execute({ holderId, reminderId: created.id })).rejects.toThrow(
      DomainError,
    );
  });

  it('outro titular não enxerga o lembrete', async () => {
    const repo = new InMemoryReminderRepository();
    const created = await new ScheduleReminderUseCase(repo).execute({
      holderId,
      title: 'Exame',
      remindAt: tomorrow(),
    });

    await expect(
      new CancelReminderUseCase(repo).execute({
        holderId: '7f1d2c4e-0000-4000-8000-000000000002',
        reminderId: created.id,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
