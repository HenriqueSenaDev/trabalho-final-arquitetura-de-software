import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/** Formato: [iv 12 bytes][tag 16 bytes][conteúdo cifrado]. */
export function encrypt(plain: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const content = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), content]);
}

export function decrypt(sealed: Buffer, key: Buffer): Buffer {
  const iv = sealed.subarray(0, IV_LENGTH);
  const tag = sealed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const content = sealed.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(content), decipher.final()]);
}

export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}
