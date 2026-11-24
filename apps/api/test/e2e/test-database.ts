import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { PrismaClient } from '@personal-health/database';

const DATABASE_PACKAGE = join(__dirname, '..', '..', '..', '..', 'packages', 'database');

/**
 * Cria um banco descartável no mesmo servidor do DATABASE_URL, aplica as
 * migrations com `prisma migrate deploy` e aponta o DATABASE_URL para ele.
 * O banco de desenvolvimento não é tocado.
 */
export async function prepareTestDatabase(name: string): Promise<string> {
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error('DATABASE_URL não definido: rode com `pnpm test:e2e` e o docker compose de pé.');
  }

  const admin = new URL(base);
  admin.pathname = '/postgres';
  const prisma = new PrismaClient({ datasourceUrl: admin.toString() });
  try {
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await prisma.$disconnect();
  }

  const url = new URL(base);
  url.pathname = `/${name}`;
  process.env.DATABASE_URL = url.toString();
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: DATABASE_PACKAGE,
    env: process.env,
    stdio: 'pipe',
  });
  return url.toString();
}
