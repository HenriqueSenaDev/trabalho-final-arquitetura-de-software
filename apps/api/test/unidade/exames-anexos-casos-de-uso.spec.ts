import { RegraVioladaErro, RecursoIndisponivelErro } from '../../src/compartilhado/dominio/erros';
import { AdicionarAnexo } from '../../src/modulos/historico/aplicacao/adicionar-anexo';
import { ExcluirExame } from '../../src/modulos/historico/aplicacao/excluir-exame';
import { RemoverAnexo } from '../../src/modulos/historico/aplicacao/remover-anexo';
import { Anexo } from '../../src/modulos/historico/dominio/anexo';
import { Exame } from '../../src/modulos/historico/dominio/exame';
import {
  ArmazenamentoAnexos,
  ArquivoAnexo,
  ReferenciaArquivo,
} from '../../src/modulos/historico/portas/armazenamento-anexos';
import { RepositorioExames } from '../../src/modulos/historico/portas/repositorio-exames';
import { ValidadorArquivo } from '../../src/modulos/historico/portas/validador-arquivo';

const titularId = 'titular-1';
const exameId = 'exame-1';
const agora = new Date('2026-11-24T12:00:00Z');

describe('Casos de uso de anexos e exames', () => {
  it('valida titularidade e limite antes do armazenamento; compensa falha de persistência', async () => {
    const eventos: string[] = [];
    const exames = new ExamesEmMemoria(eventos);
    exames.itens.set(exameId, criarExame());
    exames.falharAoSalvar = true;
    const armazenamento = new ArmazenamentoEmMemoria(eventos);
    const validador = new ValidadorEmMemoria(eventos);
    const casoDeUso = new AdicionarAnexo(exames, armazenamento, validador);

    await expect(
      casoDeUso.executar(
        exameId,
        { nomeArquivo: 'resultado.pdf', tipoMime: 'application/pdf', tamanhoBytes: 1024 },
        titularId,
      ),
    ).rejects.toThrow('Falha ao salvar exame.');
    expect(eventos).toEqual([
      `buscar:${exameId}:${titularId}`,
      'validar',
      'armazenar',
      'salvar',
      'excluir-arquivo',
    ]);

    eventos.length = 0;
    exames.falharAoSalvar = false;
    exames.itens.set(exameId, exameComCincoAnexos());
    await expect(
      casoDeUso.executar(
        exameId,
        { nomeArquivo: 'extra.pdf', tipoMime: 'application/pdf', tamanhoBytes: 1024 },
        titularId,
      ),
    ).rejects.toThrow(new RegraVioladaErro('Um exame pode ter no máximo cinco anexos.'));
    expect(eventos).toEqual([`buscar:${exameId}:${titularId}`]);
  });

  it('não armazena arquivos quando o exame pertence a outro titular', async () => {
    const eventos: string[] = [];
    const exames = new ExamesEmMemoria(eventos);
    exames.itens.set(exameId, criarExame('outro-titular'));
    const armazenamento = new ArmazenamentoEmMemoria(eventos);
    const casoDeUso = new AdicionarAnexo(exames, armazenamento, new ValidadorEmMemoria(eventos));

    await expect(
      casoDeUso.executar(
        exameId,
        { nomeArquivo: 'resultado.pdf', tipoMime: 'application/pdf', tamanhoBytes: 1024 },
        titularId,
      ),
    ).rejects.toThrow(RecursoIndisponivelErro);
    expect(eventos).toEqual([`buscar:${exameId}:${titularId}`]);
  });

  it('exclui o exame antes de remover seus arquivos e salva a remoção da referência antes do arquivo', async () => {
    const eventos: string[] = [];
    const exames = new ExamesEmMemoria(eventos);
    exames.itens.set(exameId, exameComAnexo());
    const armazenamento = new ArmazenamentoEmMemoria(eventos);

    await new ExcluirExame(exames, armazenamento).executar(exameId, titularId);
    expect(eventos).toEqual([
      `buscar:${exameId}:${titularId}`,
      `excluir-exame:${exameId}:${titularId}`,
      'excluir-arquivo',
    ]);

    eventos.length = 0;
    exames.itens.set(exameId, exameComAnexo());
    await new RemoverAnexo(exames, armazenamento).executar(exameId, 'anexo-1', titularId);
    expect(eventos).toEqual([
      `buscar:${exameId}:${titularId}`,
      'salvar',
      'excluir-arquivo',
    ]);
  });

  it('não remove anexo cuja identidade lógica não pertence ao exame consultado', async () => {
    const eventos: string[] = [];
    const exames = new ExamesEmMemoria(eventos);
    const exame = criarExame();
    exames.itens.set(
      exameId,
      Exame.restaurar({
        ...exame.paraLeitura(),
        anexos: [
          Anexo.criar({
            id: 'anexo-1',
            exameId: 'exame-alheio',
            nomeArquivo: 'resultado.pdf',
            tipoMime: 'application/pdf',
            tamanhoBytes: 1024,
            chaveArmazenamento: 'chave-1',
            criadoEm: agora,
          }),
        ],
      }),
    );
    const armazenamento = new ArmazenamentoEmMemoria(eventos);

    await expect(
      new RemoverAnexo(exames, armazenamento).executar(exameId, 'anexo-1', titularId),
    ).rejects.toThrow(RecursoIndisponivelErro);
    expect(eventos).toEqual([`buscar:${exameId}:${titularId}`]);
  });
});

class ExamesEmMemoria extends RepositorioExames {
  itens = new Map<string, Exame>();
  falharAoSalvar = false;

  constructor(private readonly eventos: string[]) {
    super();
  }

  async salvar(exame: Exame): Promise<void> {
    this.eventos.push('salvar');
    if (this.falharAoSalvar) throw new Error('Falha ao salvar exame.');
    this.itens.set(exame.id, exame);
  }

  async buscarPorId(id: string, titular: string): Promise<Exame | null> {
    this.eventos.push(`buscar:${id}:${titular}`);
    const exame = this.itens.get(id);
    return exame?.titularId === titular ? exame : null;
  }

  async listarPorTitular(titular: string): Promise<Exame[]> {
    return [...this.itens.values()].filter((exame) => exame.titularId === titular);
  }

  async excluir(id: string, titular: string): Promise<void> {
    this.eventos.push(`excluir-exame:${id}:${titular}`);
    const exame = this.itens.get(id);
    if (!exame || exame.titularId !== titular) {
      throw new RecursoIndisponivelErro();
    }
    this.itens.delete(id);
  }
}

class ArmazenamentoEmMemoria extends ArmazenamentoAnexos {
  constructor(private readonly eventos: string[]) {
    super();
  }

  async armazenar(_arquivo: ArquivoAnexo): Promise<ReferenciaArquivo> {
    this.eventos.push('armazenar');
    return { chaveArmazenamento: 'chave-1' };
  }

  async recuperar(_chave: string): Promise<Uint8Array> {
    return new Uint8Array();
  }

  async excluir(_chave: string): Promise<void> {
    this.eventos.push('excluir-arquivo');
  }
}

class ValidadorEmMemoria extends ValidadorArquivo {
  constructor(private readonly eventos: string[]) {
    super();
  }

  async validar(_arquivo: ArquivoAnexo): Promise<void> {
    this.eventos.push('validar');
  }
}

function criarExame(idTitular = titularId): Exame {
  return Exame.registrar(
    { id: exameId, titularId: idTitular, tipo: 'Hemograma', dataRealizacao: agora },
    agora,
  );
}

function criarAnexo(id: string, paraExame = exameId): Anexo {
  return Anexo.criar({
    id,
    exameId: paraExame,
    nomeArquivo: 'resultado.pdf',
    tipoMime: 'application/pdf',
    tamanhoBytes: 1024,
    chaveArmazenamento: `chave-${id}`,
    criadoEm: agora,
  });
}

function exameComAnexo(): Exame {
  return criarExame().adicionarAnexo(criarAnexo('anexo-1'));
}

function exameComCincoAnexos(): Exame {
  return Array.from({ length: 5 }, (_, indice) =>
    criarAnexo(`anexo-${indice + 1}`),
  ).reduce((exame, anexo) => exame.adicionarAnexo(anexo), criarExame());
}
