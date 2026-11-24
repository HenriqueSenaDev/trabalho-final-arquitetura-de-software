import { randomUUID } from 'node:crypto';
import {
  RecursoIndisponivelErro,
  RegraVioladaErro,
} from '../../../compartilhado/dominio/erros';
import { Anexo } from '../dominio/anexo';
import { ArmazenamentoAnexos, ArquivoAnexo } from '../portas/armazenamento-anexos';
import { RepositorioExames } from '../portas/repositorio-exames';
import { MAXIMO_ANEXOS_POR_EXAME, ValidadorArquivo } from '../portas/validador-arquivo';

export class AdicionarAnexo {
  constructor(
    private readonly exames: RepositorioExames,
    private readonly armazenamento: ArmazenamentoAnexos,
    private readonly validador: ValidadorArquivo,
  ) {}

  async executar(exameId: string, arquivo: ArquivoAnexo, titularId: string): Promise<Anexo> {
    const exame = await this.exames.buscarPorId(exameId, titularId);
    if (!exame) throw new RecursoIndisponivelErro();
    if (exame.paraLeitura().anexos.length >= MAXIMO_ANEXOS_POR_EXAME) {
      throw new RegraVioladaErro('Um exame pode ter no máximo cinco anexos.');
    }
    await this.validador.validar(arquivo);
    const referencia = await this.armazenamento.armazenar(arquivo);
    const anexo = Anexo.criar({
      id: randomUUID(),
      exameId,
      nomeArquivo: arquivo.nomeArquivo,
      tipoMime: arquivo.tipoMime,
      tamanhoBytes: arquivo.tamanhoBytes,
      chaveArmazenamento: referencia.chaveArmazenamento,
      criadoEm: new Date(),
    });
    try {
      await this.exames.salvar(exame.adicionarAnexo(anexo));
    } catch (erro) {
      try {
        await this.armazenamento.excluir(referencia.chaveArmazenamento);
      } catch (erroCompensacao) {
        throw new AggregateError(
          [erro, erroCompensacao],
          'Falha ao salvar o anexo e ao compensar o arquivo armazenado.',
        );
      }
      throw erro;
    }
    return anexo;
  }
}
