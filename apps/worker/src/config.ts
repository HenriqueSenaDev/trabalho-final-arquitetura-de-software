function number(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw ? Number(raw) : fallback;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Variável ${name} inválida: ${raw}`);
  }
  return value;
}

export const config = {
  pollIntervalMs: number('OUTBOX_POLL_INTERVAL_MS', 2000),
  batchSize: number('OUTBOX_BATCH_SIZE', 50),
  maxAttempts: number('OUTBOX_MAX_ATTEMPTS', 5),
  notificationProvider: process.env.NOTIFICATION_PROVIDER ?? 'console',
  notificationProviderUrl: process.env.NOTIFICATION_PROVIDER_URL ?? '',
  notificationProviderToken: process.env.NOTIFICATION_PROVIDER_TOKEN ?? '',
};

export type WorkerConfig = typeof config;
