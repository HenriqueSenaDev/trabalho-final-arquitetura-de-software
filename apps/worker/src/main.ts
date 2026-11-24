import { PrismaClient } from '@personal-health/database';
import { config } from './config';
import { errorMessage, logger } from './logger';
import { createNotificationProvider } from './notifications/create-provider';
import { NotificationDispatcher } from './notifications/notification-dispatcher';
import { OutboxRelay } from './outbox/outbox-relay';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  await prisma.$connect();

  const relay = new OutboxRelay(prisma, config);
  const dispatcher = new NotificationDispatcher(
    prisma,
    createNotificationProvider(config),
    config,
  );

  let running = true;
  const stop = (signal: string) => {
    logger.info('Encerrando processador', { signal });
    running = false;
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));

  logger.info('Processador de eventos e lembretes iniciado', {
    provider: config.notificationProvider,
    pollIntervalMs: config.pollIntervalMs,
  });

  while (running) {
    try {
      const events = await relay.processBatch();
      const notices = await dispatcher.processDue();
      // Lote cheio indica fila acumulada: segue drenando sem esperar.
      if (events < config.batchSize && notices < config.batchSize) {
        await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
      }
    } catch (error) {
      logger.error('Falha no ciclo do processador', { error: errorMessage(error) });
      await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
    }
  }

  await prisma.$disconnect();
}

void main();
