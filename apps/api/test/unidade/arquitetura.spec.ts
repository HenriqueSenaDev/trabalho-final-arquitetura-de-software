/**
 * Regras de dependência da arquitetura (ADR 01), verificadas a cada `pnpm test`.
 *
 *  1. Domínio, aplicação e portas não dependem de framework nem de banco.
 *  2. Domínio não depende de aplicação, portas ou adaptadores.
 *  3. Aplicação e portas não dependem de adaptadores.
 *  4. Um módulo só usa outro pelo `contrato.ts` dele. A composição
 *     (`*.module.ts`) pode importar o módulo Nest do outro para injeção.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const SRC = resolve(__dirname, '../../src');
const PACOTES_DE_INFRAESTRUTURA = [/^@nestjs\//, /^@personal-health\/database/, /^express$/, /^class-/];

interface Importacao {
  arquivo: string; // relativo a src, com "/"
  alvo: string; // como escrito no import
  resolvido: string | null; // relativo a src, para imports locais
}

function arquivosTs(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivosTs(caminho);
    return caminho.endsWith('.ts') ? [caminho] : [];
  });
}

function importacoes(): Importacao[] {
  return arquivosTs(SRC).flatMap((caminho) => {
    const codigo = readFileSync(caminho, 'utf8');
    const arquivo = relative(SRC, caminho).split(sep).join('/');
    return [...codigo.matchAll(/from\s+'([^']+)'/g)].map(([, alvo]) => ({
      arquivo,
      alvo,
      resolvido: alvo.startsWith('.')
        ? relative(SRC, resolve(dirname(caminho), alvo)).split(sep).join('/')
        : null,
    }));
  });
}

/** 'modulos/historico/aplicacao/x.ts' -> { modulo: 'historico', camada: 'aplicacao' } */
function localizar(caminho: string): { modulo: string | null; camada: string | null } {
  const partes = caminho.split('/');
  if (partes[0] === 'modulos') return { modulo: partes[1], camada: partes[2] ?? null };
  if (partes[0] === 'compartilhado') return { modulo: null, camada: partes[1] ?? null };
  return { modulo: null, camada: partes[0] };
}

const NUCLEO = ['dominio', 'aplicacao', 'portas'];
const todas = importacoes();

describe('Arquitetura: regras de dependência', () => {
  it('encontra os arquivos de src (sanidade)', () => {
    expect(todas.length).toBeGreaterThan(50);
  });

  it('domínio, aplicação e portas não importam framework nem banco', () => {
    const violacoes = todas.filter(
      ({ arquivo, alvo }) =>
        NUCLEO.includes(localizar(arquivo).camada ?? '') &&
        PACOTES_DE_INFRAESTRUTURA.some((padrao) => padrao.test(alvo)),
    );
    expect(violacoes).toEqual([]);
  });

  it('domínio só depende de domínio', () => {
    const violacoes = todas.filter(
      ({ arquivo, resolvido }) =>
        localizar(arquivo).camada === 'dominio' &&
        resolvido !== null &&
        localizar(resolvido).camada !== 'dominio',
    );
    expect(violacoes).toEqual([]);
  });

  it('aplicação e portas não dependem de adaptadores nem da Entrada HTTP', () => {
    const violacoes = todas.filter(({ arquivo, resolvido }) => {
      if (!['aplicacao', 'portas'].includes(localizar(arquivo).camada ?? '') || !resolvido) {
        return false;
      }
      const camadaAlvo = localizar(resolvido).camada;
      return camadaAlvo === 'adaptadores' || camadaAlvo === 'entrada-http';
    });
    expect(violacoes).toEqual([]);
  });

  it('um módulo só usa outro pelo contrato.ts', () => {
    const violacoes = todas.filter(({ arquivo, resolvido }) => {
      const origem = localizar(arquivo).modulo;
      const destino = resolvido ? localizar(resolvido).modulo : null;
      if (!origem || !destino || origem === destino) return false;
      const ehContrato = resolvido === `modulos/${destino}/contrato`;
      const ehComposicao =
        arquivo.endsWith('.module.ts') && resolvido === `modulos/${destino}/${destino}.module`;
      return !ehContrato && !ehComposicao;
    });
    expect(violacoes).toEqual([]);
  });
});
