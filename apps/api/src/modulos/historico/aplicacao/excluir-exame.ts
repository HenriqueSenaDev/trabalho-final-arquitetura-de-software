import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { ArmazenamentoAnexos } from '../portas/armazenamento-anexos';
import { RepositorioExames } from '../portas/repositorio-exames';

export class ExcluirExame {
  constructor(
    private readonly exames: RepositorioExames,
    private readonly armazenamento: ArmazenamentoAnexos,
  ) {}

  async executar(exameId: string, titularId: string): Promise<void> {
    const exame = await this.exames.buscarPorId(exameId, titularId);
    if (!exame) throw new RecursoIndisponivelErro();
    await this.exames.excluir(exameId, titularId);
    for (const anexo of exame.paraLeitura().anexos) {
      await this.armazenamento.excluir(anexo.chaveArmazenamento);
    }
  }
}
