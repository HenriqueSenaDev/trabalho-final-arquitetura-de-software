import { PrismaClient } from '@personal-health/database';
import { WorkerConfig } from '../config';
import { dispatchEvent } from '../handlers';
import { errorMessage, logger } from '../logger';

interface LockedEvent {
  id: string;
  type: string;
  payload: unknown;
}

/**
 * Consome o outbox com entrega pelo menos uma vez. Cada evento é travado
 * com FOR UPDATE SKIP LOCKED, então várias réplicas do processador podem
 * rodar em paralelo sem pegar o mesmo evento.
 */
export class OutboxRelay {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: WorkerConfig,
  ) {}

  async processBatch(): Promise<number> {
    const pending = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM outbox_events
      WHERE status = 'PENDING'
      ORDER BY occurred_at
      LIMIT ${this.config.batchSize}
    `;

    for (const { id } of pending) {
      await this.processOne(id);
    }
    return pending.length;
  }

  private async processOne(id: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const [event] = await tx.$queryRaw<LockedEvent[]>`
          SELECT id, type, payload FROM outbox_events
          WHERE id = ${id}::uuid AND status = 'PENDING'
          FOR UPDATE SKIP LOCKED
        `;
        if (!event) {
          return;
        }

        await dispatchEvent(event.type, event.payload, tx);
        await tx.outboxEvent.update({
          where: { id },
          data: {
            status: 'PROCESSED',
            processedAt: new Date(),
            attempts: { increment: 1 },
            lastError: null,
          },
        });
      });
    } catch (error) {
      const message = errorMessage(error);
      const updated = await this.prisma.outboxEvent.update({
        where: { id },
        data: { attempts: { increment: 1 }, lastError: message },
      });
      if (updated.attempts >= this.config.maxAttempts) {
        await this.prisma.outboxEvent.update({
          where: { id },
          data: { status: 'FAILED' },
        });
      }
      logger.error('Falha ao processar evento do outbox', {
        id,
        attempts: updated.attempts,
        error: message,
      });
    }
  }
}
