import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from './index';

const PASTA_DE_MIGRATIONS = join(__dirname, '..', 'prisma', 'migrations');

/**
 * Para os testes de ponta a ponta: recria um banco descartável no mesmo
 * servidor do DATABASE_URL, aplica as migrations e passa a apontar o
 * DATABASE_URL para ele. O banco de desenvolvimento não é tocado.
 */
export async function prepararBancoDeTeste(nome: string): Promise<string> {
  const urlOriginal = process.env.DATABASE_URL;
  if (!urlOriginal) {
    throw new Error('Defina DATABASE_URL (veja .env.example).');
  }

  const servidor = new PrismaClient();
  try {
    await servidor.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`);
    await servidor.$executeRawUnsafe(`CREATE DATABASE "${nome}"`);
  } finally {
    await servidor.$disconnect();
  }

  const url = new URL(urlOriginal);
  url.pathname = `/${nome}`;
  process.env.DATABASE_URL = url.toString();

  const banco = new PrismaClient();
  try {
    for (const pasta of readdirSync(PASTA_DE_MIGRATIONS).filter((item) => /^\d+_/.test(item)).sort()) {
      const sql = readFileSync(join(PASTA_DE_MIGRATIONS, pasta, 'migration.sql'), 'utf8');
      for (const comando of comandosDe(sql)) {
        await banco.$executeRawUnsafe(comando);
      }
    }
  } finally {
    await banco.$disconnect();
  }
  return process.env.DATABASE_URL;
}

/** As migrations deste projeto não têm `;` dentro de textos ou funções. */
function comandosDe(sql: string): string[] {
  return sql
    .split('\n')
    .filter((linha) => !linha.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((comando) => comando.trim())
    .filter(Boolean);
}
