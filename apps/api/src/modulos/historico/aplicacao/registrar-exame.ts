import { UnidadeDeTrabalho } from '../../../compartilhado/portas/unidade-de-trabalho';
import { Exame, NovoExame } from '../dominio/exame';
import { RepositorioExames } from '../portas/repositorio-exames';

export class RegistrarExame {
  constructor(
    private readonly exames: RepositorioExames,
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
  ) {}

  async executar(comando: Omit<NovoExame, 'titularId'>, titularId: string): Promise<Exame> {
    const exame = Exame.registrar({ ...comando, titularId }, new Date());
    await this.unidadeDeTrabalho.executar(() => this.exames.salvar(exame));
    return exame;
  }
}
