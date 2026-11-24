import { Tratamento } from '../dominio/tratamento';
import { RepositorioTratamentos } from '../portas/repositorio-tratamentos';

export class ListarTratamentos {
  constructor(private readonly tratamentos: RepositorioTratamentos) {}

  executar(titularId: string): Promise<Tratamento[]> {
    return this.tratamentos.listarPorTitular(titularId);
  }
}
