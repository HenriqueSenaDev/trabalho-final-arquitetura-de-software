import { spawn } from 'node:child_process';

/** pg_dump/pg_restore não aceitam o parâmetro `schema` da URL do Prisma. */
function toLibpqUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete('schema');
  return url.toString();
}

function run(command: string, args: string[], input?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
      } else {
        reject(new Error(`${command} saiu com código ${code}: ${Buffer.concat(stderr)}`));
      }
    });

    child.stdin.end(input);
  });
}

export function dumpDatabase(databaseUrl: string): Promise<Buffer> {
  return run('pg_dump', ['--format=custom', '--no-owner', toLibpqUrl(databaseUrl)]);
}

export async function restoreDatabase(databaseUrl: string, dump: Buffer): Promise<void> {
  await run(
    'pg_restore',
    ['--clean', '--if-exists', '--no-owner', '--dbname', toLibpqUrl(databaseUrl)],
    dump,
  );
}
