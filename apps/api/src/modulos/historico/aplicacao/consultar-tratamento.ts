import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { Tratamento } from '../dominio/tratamento';
import { RepositorioTratamentos } from '../portas/repositorio-tratamentos';

export class ConsultarTratamento {
  constructor(private readonly tratamentos: RepositorioTratamentos) {}

  async executar(tratamentoId: string, titularId: string): Promise<Tratamento> {
    const tratamento = await this.tratamentos.buscarPorId(tratamentoId, titularId);
    if (!tratamento) throw new RecursoIndisponivelErro();
    return tratamento;
  }
}
