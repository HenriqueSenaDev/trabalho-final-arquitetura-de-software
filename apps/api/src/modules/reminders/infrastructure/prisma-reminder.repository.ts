import { Injectable } from '@nestjs/common';
import { Reminder as ReminderRow } from '@personal-health/database';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { toOutboxRows } from '../../../infrastructure/outbox/outbox';
import { Reminder } from '../domain/reminder';
import { ReminderRepository } from '../domain/reminder.repository';

@Injectable()
export class PrismaReminderRepository extends ReminderRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(reminder: Reminder): Promise<void> {
    const { id, ...data } = reminder.toSnapshot();
    const events = reminder.pullEvents();

    await this.prisma.$transaction([
      this.prisma.reminder.upsert({
        where: { id },
        create: { id, ...data },
        update: { title: data.title, notes: data.notes, remindAt: data.remindAt, status: data.status },
      }),
      this.prisma.outboxEvent.createMany({ data: toOutboxRows(events) }),
    ]);
  }

  async findById(id: string): Promise<Reminder | null> {
    const row = await this.prisma.reminder.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async listByHolder(holderId: string): Promise<Reminder[]> {
    const rows = await this.prisma.reminder.findMany({
      where: { holderId },
      orderBy: { remindAt: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: ReminderRow): Reminder {
    return Reminder.restore({
      id: row.id,
      holderId: row.holderId,
      title: row.title,
      notes: row.notes,
      remindAt: row.remindAt,
      status: row.status,
      createdAt: row.createdAt,
    });
  }
}
