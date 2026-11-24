import { Bucket } from './bucket';
import { decrypt, encrypt, sha256 } from './cipher';
import { BackupConfig } from './config';
import { dumpDatabase, restoreDatabase } from './postgres';

export interface Manifest {
  id: string;
  createdAt: string;
  database: { key: string; sha256: string; bytes: number };
  attachments: { key: string; sha256: string; bytes: number }[];
}

const SNAPSHOTS_PREFIX = 'snapshots/';

/** Ponto de recuperação: dump do banco + cópia dos anexos, tudo cifrado. */
export async function createSnapshot(config: BackupConfig): Promise<Manifest> {
  const repository = new Bucket(config.repository);
  const attachments = new Bucket(config.attachments);
  const createdAt = new Date();
  const id = createdAt.toISOString().replace(/[:.]/g, '-');
  const base = `${SNAPSHOTS_PREFIX}${id}`;

  const dump = await dumpDatabase(config.databaseUrl);
  const databaseKey = `${base}/database.dump.enc`;
  await repository.put(databaseKey, encrypt(dump, config.encryptionKey));

  const copied: Manifest['attachments'] = [];
  for await (const key of attachments.listKeys()) {
    const content = await attachments.get(key);
    await repository.put(`${base}/attachments/${key}.enc`, encrypt(content, config.encryptionKey));
    copied.push({ key, sha256: sha256(content), bytes: content.length });
  }

  const manifest: Manifest = {
    id,
    createdAt: createdAt.toISOString(),
    database: { key: databaseKey, sha256: sha256(dump), bytes: dump.length },
    attachments: copied,
  };
  await repository.put(
    `${base}/manifest.json.enc`,
    encrypt(Buffer.from(JSON.stringify(manifest)), config.encryptionKey),
  );
  return manifest;
}

export async function listSnapshots(config: BackupConfig): Promise<string[]> {
  const repository = new Bucket(config.repository);
  const ids: string[] = [];
  for await (const key of repository.listKeys(SNAPSHOTS_PREFIX)) {
    if (key.endsWith('/manifest.json.enc')) {
      ids.push(key.slice(SNAPSHOTS_PREFIX.length, -'/manifest.json.enc'.length));
    }
  }
  return ids.sort();
}

function verify(content: Buffer, expected: string, label: string): void {
  if (sha256(content) !== expected) {
    throw new Error(`Checksum não confere para ${label}; restauração abortada.`);
  }
}

export async function restoreSnapshot(config: BackupConfig, id: string): Promise<Manifest> {
  const repository = new Bucket(config.repository);
  const attachments = new Bucket(config.attachments);
  const base = `${SNAPSHOTS_PREFIX}${id}`;

  const manifest = JSON.parse(
    decrypt(await repository.get(`${base}/manifest.json.enc`), config.encryptionKey).toString(),
  ) as Manifest;

  // Decifra e confere tudo antes de tocar no ambiente de destino.
  const dump = decrypt(await repository.get(manifest.database.key), config.encryptionKey);
  verify(dump, manifest.database.sha256, 'banco');

  const files: { key: string; content: Buffer }[] = [];
  for (const item of manifest.attachments) {
    const content = decrypt(
      await repository.get(`${base}/attachments/${item.key}.enc`),
      config.encryptionKey,
    );
    verify(content, item.sha256, item.key);
    files.push({ key: item.key, content });
  }

  await restoreDatabase(config.databaseUrl, dump);
  for (const file of files) {
    await attachments.put(file.key, file.content);
  }
  return manifest;
}
