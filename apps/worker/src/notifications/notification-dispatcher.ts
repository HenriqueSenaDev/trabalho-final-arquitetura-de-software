import { PrismaClient } from '@personal-health/database';
import { WorkerConfig } from '../config';
import { errorMessage, logger } from '../logger';
import { NotificationProvider } from './notification-provider';

interface DueDelivery {
  id: string;
  reminder_id: string;
}

/** Entrega os avisos reservados cuja hora chegou. */
export class NotificationDispatcher {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly provider: NotificationProvider,
    private readonly config: WorkerConfig,
  ) {}

  async processDue(): Promise<number> {
    const due = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM notification_deliveries
      WHERE status = 'RESERVED' AND scheduled_for <= now()
      ORDER BY scheduled_for
      LIMIT ${this.config.batchSize}
    `;

    for (const { id } of due) {
      await this.deliver(id);
    }
    return due.length;
  }

  private async deliver(id: string): Promise<void> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const [delivery] = await tx.$queryRaw<DueDelivery[]>`
            SELECT id, reminder_id FROM notification_deliveries
            WHERE id = ${id}::uuid AND status = 'RESERVED'
            FOR UPDATE SKIP LOCKED
          `;
          if (!delivery) {
            return;
          }

          const reminder = await tx.reminder.findUniqueOrThrow({
            where: { id: delivery.reminder_id },
            include: { holder: true },
          });
          if (reminder.status !== 'SCHEDULED') {
            await tx.notificationDelivery.update({
              where: { id },
              data: { status: 'CANCELLED' },
            });
            return;
          }

          await this.provider.send({
            deliveryId: id,
            recipient: {
              holderId: reminder.holder.id,
              name: reminder.holder.fullName,
              email: reminder.holder.email,
            },
            title: reminder.title,
            body: reminder.notes ?? 'Você tem um lembrete de saúde agendado.',
          });

          await tx.notificationDelivery.update({
            where: { id },
            data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
          });
          await tx.reminder.update({
            where: { id: reminder.id },
            data: { status: 'DONE' },
          });
        },
        { timeout: 20_000 },
      );
    } catch (error) {
      const message = errorMessage(error);
      const updated = await this.prisma.notificationDelivery.update({
        where: { id },
        data: { attempts: { increment: 1 }, lastError: message },
      });
      if (updated.attempts >= this.config.maxAttempts) {
        await this.prisma.notificationDelivery.update({
          where: { id },
          data: { status: 'FAILED' },
        });
      }
      logger.error('Falha ao entregar aviso', { id, attempts: updated.attempts, error: message });
    }
  }
}
