import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { AlteracaoExame } from '../dominio/exame';
import { RepositorioExames } from '../portas/repositorio-exames';

export class AlterarExame {
  constructor(private readonly exames: RepositorioExames) {}

  async executar(exameId: string, comando: AlteracaoExame, titularId: string): Promise<void> {
    const exame = await this.exames.buscarPorId(exameId, titularId);
    if (!exame) throw new RecursoIndisponivelErro();
    await this.exames.salvar(exame.alterar(comando));
  }
}
