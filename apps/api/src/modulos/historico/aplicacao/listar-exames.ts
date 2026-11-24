import { Exame } from '../dominio/exame';
import { RepositorioExames } from '../portas/repositorio-exames';

export class ListarExames {
  constructor(private readonly exames: RepositorioExames) {}

  executar(titularId: string): Promise<Exame[]> {
    return this.exames.listarPorTitular(titularId);
  }
}
