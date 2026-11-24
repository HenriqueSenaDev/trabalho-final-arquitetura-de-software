/**
 * Regra de dependências do README: domain e application não dependem de
 * framework, banco nem SDK externo; esses ficam em infrastructure e
 * presentation, que implementam ou chamam as portas.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..', 'src');
const FORBIDDEN = [/^@nestjs\//, /^@personal-health\/database$/, /^@aws-sdk\//, /^express$/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
  });
}

function imports(path: string): string[] {
  return [...readFileSync(path, 'utf8').matchAll(/from '([^']+)'/g)].map((match) => match[1]);
}

describe('Arquitetura', () => {
  const layered = files(SRC).filter((path) => /[\\/](domain|application)[\\/]/.test(path));

  it('há arquivos de domain e application para verificar', () => {
    expect(layered.length).toBeGreaterThan(20);
  });

  it.each(layered.map((path) => [relative(SRC, path), path]))(
    '%s não importa framework, banco nem SDK',
    (_name, path) => {
      const offending = imports(path).filter((source) => FORBIDDEN.some((rule) => rule.test(source)));
      expect(offending).toEqual([]);
    },
  );
});
