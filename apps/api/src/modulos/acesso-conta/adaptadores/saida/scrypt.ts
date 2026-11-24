import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  senha: string,
  sal: Buffer,
  tamanho: number,
) => Promise<Buffer>;

const TAMANHO_DA_CHAVE = 64;

/** Formato gravado: `<sal base64>:<chave base64>`. */
export async function gerarHashDeSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const chave = await scryptAsync(senha, sal, TAMANHO_DA_CHAVE);
  return `${sal.toString('base64')}:${chave.toString('base64')}`;
}

export async function senhaConfere(senha: string, hash: string): Promise<boolean> {
  const [sal, chave] = hash.split(':');
  if (!sal || !chave) {
    return false;
  }
  const esperada = Buffer.from(chave, 'base64');
  const calculada = await scryptAsync(senha, Buffer.from(sal, 'base64'), esperada.length);
  return timingSafeEqual(esperada, calculada);
}
