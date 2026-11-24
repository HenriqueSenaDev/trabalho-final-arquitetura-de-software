import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { Exame } from '../dominio/exame';
import { RepositorioExames } from '../portas/repositorio-exames';

export class ConsultarExame {
  constructor(private readonly exames: RepositorioExames) {}

  async executar(exameId: string, titularId: string): Promise<Exame> {
    const exame = await this.exames.buscarPorId(exameId, titularId);
    if (!exame) throw new RecursoIndisponivelErro();
    return exame;
  }
}
