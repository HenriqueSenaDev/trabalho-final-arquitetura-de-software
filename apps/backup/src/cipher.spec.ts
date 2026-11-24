import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { decrypt, encrypt } from './cipher';

test('cifra e decifra sem perda', () => {
  const key = randomBytes(32);
  const plain = Buffer.from('laudo do exame de sangue');
  const sealed = encrypt(plain, key);

  assert.notDeepEqual(sealed.subarray(28), plain);
  assert.deepEqual(decrypt(sealed, key), plain);
});

test('recusa conteúdo adulterado', () => {
  const key = randomBytes(32);
  const sealed = encrypt(Buffer.from('registro'), key);
  sealed[sealed.length - 1] ^= 0xff;

  assert.throws(() => decrypt(sealed, key));
});

test('recusa chave errada', () => {
  const sealed = encrypt(Buffer.from('registro'), randomBytes(32));
  assert.throws(() => decrypt(sealed, randomBytes(32)));
});
