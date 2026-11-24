import { Injectable } from '@nestjs/common';
import { Reminder as ReminderRow } from '@personal-health/database';
import { ConflictError } from '../../../core/domain/errors';
import { TransactionContext } from '../../../infrastructure/database/transaction-context';
import { toOutboxRows } from '../../../infrastructure/outbox/outbox';
import { Reminder } from '../domain/reminder';
import { ReminderRepository } from '../domain/reminder.repository';

const CHANGED_MEANWHILE = 'O lembrete foi alterado por outra operação. Tente de novo.';

@Injectable()
export class PrismaReminderRepository extends ReminderRepository {
  constructor(private readonly db: TransactionContext) {
    super();
  }

  async save(reminder: Reminder): Promise<void> {
    const { id, ...data } = reminder.toSnapshot();
    const events = reminder.pullEvents();

    // Dentro da UnitOfWork da requisição, quando houver (consulta + aviso).
    await this.db.run(async (client) => {
      if (reminder.loadedVersion === null) {
        await client.reminder.create({ data: { id, ...data } });
      } else {
        const { count } = await client.reminder.updateMany({
          where: { id, version: reminder.loadedVersion },
          data: {
            title: data.title,
            notes: data.notes,
            remindAt: data.remindAt,
            status: data.status,
            version: data.version,
          },
        });
        if (count !== 1) {
          throw new ConflictError(CHANGED_MEANWHILE);
        }
      }
      await client.outboxEvent.createMany({ data: toOutboxRows(events) });
    });
  }

  async findById(id: string): Promise<Reminder | null> {
    const row = await this.db.client.reminder.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async listByHolder(holderId: string): Promise<Reminder[]> {
    const rows = await this.db.client.reminder.findMany({
      where: { holderId },
      orderBy: { remindAt: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByRecord(holderId: string, recordId: string): Promise<Reminder | null> {
    const row = await this.db.client.reminder.findFirst({ where: { holderId, recordId } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: ReminderRow): Reminder {
    return Reminder.restore({
      id: row.id,
      holderId: row.holderId,
      recordId: row.recordId,
      title: row.title,
      notes: row.notes,
      remindAt: row.remindAt,
      status: row.status,
      version: row.version,
      createdAt: row.createdAt,
    });
  }
}
