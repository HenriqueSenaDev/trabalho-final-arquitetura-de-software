import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../application/password-hasher.port';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

@Injectable()
export class ScryptPasswordHasher extends PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await scryptAsync(plain, salt, KEY_LENGTH);
    return `${salt.toString('base64')}:${key.toString('base64')}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(':');
    if (!salt || !key) {
      return false;
    }
    const expected = Buffer.from(key, 'base64');
    const actual = await scryptAsync(
      plain,
      Buffer.from(salt, 'base64'),
      expected.length,
    );
    return timingSafeEqual(expected, actual);
  }
}
