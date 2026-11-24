import { PrismaClient } from '@personal-health/database';
import { WorkerConfig } from '../config';
import { errorMessage, logger } from '../logger';
import { NotificationProvider } from './notification-provider';

interface DueDelivery {
  id: string;
  reminder_id: string;
  version: number;
}

/** ADR 04: o provedor só recebe uma mensagem genérica, sem conteúdo clínico. */
export const GENERIC_MESSAGE = 'Você tem um lembrete de saúde. Abra o PersonalHealth para ver.';

/**
 * Entrega os avisos reservados cuja hora chegou. Cada aviso é travado com
 * FOR UPDATE SKIP LOCKED durante o envio, então réplicas em paralelo nunca
 * entregam o mesmo aviso ao mesmo tempo.
 *
 * Antes do envio, revalida o lembrete (ADR 03): se ele foi reagendado ou
 * cancelado, a versão deste aviso não é mais a vigente e ele não sai.
 */
export class NotificationDispatcher {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly provider: NotificationProvider,
    private readonly config: WorkerConfig,
  ) {}

  async processDue(): Promise<number> {
    // As colunas são timestamp em UTC: compara com o relógio do banco em UTC.
    const due = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM notification_deliveries
      WHERE status = 'RESERVED' AND scheduled_for <= timezone('utc', now())
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
            SELECT id, reminder_id, version FROM notification_deliveries
            WHERE id = ${id}::uuid AND status = 'RESERVED'
            FOR UPDATE SKIP LOCKED
          `;
          if (!delivery) {
            return;
          }

          const reminder = await tx.reminder.findUniqueOrThrow({
            where: { id: delivery.reminder_id },
          });
          if (reminder.status !== 'SCHEDULED' || reminder.version !== delivery.version) {
            await tx.notificationDelivery.update({
              where: { id },
              data: { status: 'CANCELLED' },
            });
            logger.info('Versão substituída ou cancelada: aviso não enviado', {
              id,
              reminderId: reminder.id,
              deliveryVersion: delivery.version,
              currentVersion: reminder.version,
            });
            return;
          }

          // Destinos: aparelhos com sessão ativa. Sessão revogada não recebe (ADR 04).
          const sessions = await tx.session.findMany({
            where: { holderId: reminder.holderId, revokedAt: null, deliveryToken: { not: null } },
            select: { deliveryToken: true },
          });
          const destinations = [...new Set(sessions.map((session) => session.deliveryToken!))];
          if (destinations.length === 0) {
            await tx.notificationDelivery.update({
              where: { id },
              data: {
                status: 'FAILED',
                attempts: { increment: 1 },
                lastError: 'Titular sem aparelho com sessão ativa.',
              },
            });
            return;
          }

          await this.provider.send({
            deliveryId: id,
            idempotencyKey: `${reminder.id}:v${delivery.version}`,
            destinations,
            message: GENERIC_MESSAGE,
          });

          await tx.notificationDelivery.update({
            where: { id },
            data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
          });
          // Só conclui a versão que foi entregue: um reagendamento concorrente fica intacto.
          await tx.reminder.updateMany({
            where: { id: reminder.id, version: delivery.version, status: 'SCHEDULED' },
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
