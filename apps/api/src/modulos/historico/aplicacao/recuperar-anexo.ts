import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { ArmazenamentoAnexos } from '../portas/armazenamento-anexos';
import { RepositorioExames } from '../portas/repositorio-exames';

export class RecuperarAnexo {
  constructor(
    private readonly exames: RepositorioExames,
    private readonly armazenamento: ArmazenamentoAnexos,
  ) {}

  async executar(exameId: string, anexoId: string, titularId: string): Promise<Uint8Array> {
    const exame = await this.exames.buscarPorId(exameId, titularId);
    const anexo = exame
      ?.paraLeitura()
      .anexos.find((item) => item.id === anexoId && item.exameId === exameId);
    if (!anexo) throw new RecursoIndisponivelErro();
    return this.armazenamento.recuperar(anexo.chaveArmazenamento);
  }
}
