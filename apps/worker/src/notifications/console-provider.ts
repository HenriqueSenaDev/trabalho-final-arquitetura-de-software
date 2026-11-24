import { logger } from '../logger';
import { Notice, NotificationProvider } from './notification-provider';

/** Provedor para desenvolvimento: só registra o aviso no log. */
export class ConsoleNotificationProvider implements NotificationProvider {
  async send(notice: Notice): Promise<void> {
    logger.info('Aviso enviado (console)', { ...notice });
  }
}
