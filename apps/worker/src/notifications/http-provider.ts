import { Notice, NotificationProvider } from './notification-provider';

/** Envia o aviso para um provedor externo via HTTP (webhook genérico). */
export class HttpNotificationProvider implements NotificationProvider {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {
    if (!url) {
      throw new Error('NOTIFICATION_PROVIDER_URL é obrigatório para o provedor http.');
    }
  }

  async send(notice: Notice): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': notice.deliveryId,
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(notice),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Provedor respondeu ${response.status}`);
    }
  }
}
