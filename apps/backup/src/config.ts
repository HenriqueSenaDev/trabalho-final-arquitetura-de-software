function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export interface BucketConfig {
  endpoint?: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export function loadConfig() {
  const encryptionKey = Buffer.from(required('BACKUP_ENCRYPTION_KEY'), 'base64');
  if (encryptionKey.length !== 32) {
    throw new Error('BACKUP_ENCRYPTION_KEY precisa ter 32 bytes em base64.');
  }

  return {
    databaseUrl: required('DATABASE_URL'),
    encryptionKey,
    attachments: {
      endpoint: process.env.STORAGE_ENDPOINT,
      region: process.env.STORAGE_REGION ?? 'us-east-1',
      accessKey: required('STORAGE_ACCESS_KEY'),
      secretKey: required('STORAGE_SECRET_KEY'),
      bucket: required('STORAGE_BUCKET'),
    } satisfies BucketConfig,
    repository: {
      endpoint: process.env.BACKUP_ENDPOINT,
      region: process.env.BACKUP_REGION ?? 'us-east-1',
      accessKey: required('BACKUP_ACCESS_KEY'),
      secretKey: required('BACKUP_SECRET_KEY'),
      bucket: required('BACKUP_BUCKET'),
    } satisfies BucketConfig,
  };
}

export type BackupConfig = ReturnType<typeof loadConfig>;
