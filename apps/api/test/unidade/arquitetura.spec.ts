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

const RAIZ_WORKSPACE = resolve(__dirname, '../../../..');
const SRC = resolve(RAIZ_WORKSPACE, 'apps/api/src');
const WORKER_SRC = resolve(RAIZ_WORKSPACE, 'apps/worker/src');
const CONTRACTS_SRC = resolve(RAIZ_WORKSPACE, 'packages/contracts/src');
const PACOTES_DE_INFRAESTRUTURA = [
  /^@nestjs\//,
  /^@personal-health\/database/,
  /^@prisma\//,
  /^express$/,
  /^class-/,
  /^@aws-sdk\//,
  /^@google-cloud\/storage/,
  /^@azure\/storage-blob/,
  /^minio$/,
  /^@minio\//,
];

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

function importacoes(pasta: string, raiz = SRC, raizResolucao = raiz): Importacao[] {
  return arquivosTs(pasta).flatMap((caminho) => {
    const codigo = readFileSync(caminho, 'utf8');
    const arquivo = relative(raiz, caminho).split(sep).join('/');
    return [...codigo.matchAll(/from\s+'([^']+)'/g)].map(([, alvo]) => ({
      arquivo,
      alvo,
      resolvido: alvo.startsWith('.')
        ? relative(raizResolucao, resolve(dirname(caminho), alvo)).split(sep).join('/')
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
const todas = importacoes(SRC);
const importsWorker = importacoes(WORKER_SRC, WORKER_SRC, RAIZ_WORKSPACE);
const importsContracts = importacoes(CONTRACTS_SRC, CONTRACTS_SRC, RAIZ_WORKSPACE);

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

  it('os arquivos novos do Histórico permanecem sujeitos às regras de camada', () => {
    const arquivosHistorico = todas.filter(({ arquivo }) => arquivo.startsWith('modulos/historico/'));
    expect(arquivosHistorico.length).toBeGreaterThan(20);
    const dominiosComImportDeInfra = todas.filter(
      ({ arquivo, alvo }) =>
        arquivo.startsWith('modulos/historico/dominio/') &&
        PACOTES_DE_INFRAESTRUTURA.some((padrao) => padrao.test(alvo)),
    );
    expect(dominiosComImportDeInfra).toEqual([]);
  });

  it('packages/contracts não depende de aplicações', () => {
    const violacoes = importsContracts.filter(
      ({ alvo, resolvido }) =>
        /(^|\/)apps\//.test(alvo) ||
        (resolvido !== null && !resolvido.startsWith('packages/contracts/')),
    );
    expect(violacoes).toEqual([]);
  });

  it('o worker não depende da API', () => {
    const violacoes = importsWorker.filter(
      ({ alvo, resolvido }) =>
        /^@personal-health\/api(?:\/|$)/.test(alvo) ||
        (resolvido !== null && resolvido.startsWith('apps/api/')),
    );
    expect(violacoes).toEqual([]);
  });
});
