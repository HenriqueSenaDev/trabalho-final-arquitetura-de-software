import { WorkerConfig } from '../config';
import { ConsoleNotificationProvider } from './console-provider';
import { HttpNotificationProvider } from './http-provider';
import { NotificationProvider } from './notification-provider';

export function createNotificationProvider(config: WorkerConfig): NotificationProvider {
  switch (config.notificationProvider) {
    case 'console':
      return new ConsoleNotificationProvider();
    case 'http':
      return new HttpNotificationProvider(
        config.notificationProviderUrl,
        config.notificationProviderToken,
      );
    default:
      throw new Error(`Provedor de notificações desconhecido: ${config.notificationProvider}`);
  }
}
