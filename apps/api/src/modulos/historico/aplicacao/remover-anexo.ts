import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { ArmazenamentoAnexos } from '../portas/armazenamento-anexos';
import { RepositorioExames } from '../portas/repositorio-exames';

export class RemoverAnexo {
  constructor(
    private readonly exames: RepositorioExames,
    private readonly armazenamento: ArmazenamentoAnexos,
  ) {}

  async executar(exameId: string, anexoId: string, titularId: string): Promise<void> {
    const exame = await this.exames.buscarPorId(exameId, titularId);
    const anexo = exame
      ?.paraLeitura()
      .anexos.find((item) => item.id === anexoId && item.exameId === exameId);
    if (!exame || !anexo) throw new RecursoIndisponivelErro();
    await this.exames.salvar(exame.removerAnexo(anexoId));
    await this.armazenamento.excluir(anexo.chaveArmazenamento);
  }
}
