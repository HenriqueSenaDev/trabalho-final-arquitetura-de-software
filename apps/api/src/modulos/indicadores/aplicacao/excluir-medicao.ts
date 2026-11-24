import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { RepositorioMedicoes } from '../portas/repositorio-medicoes';

/**
 * Caso de uso: ExcluirMedicao (C4 nível 4 do componente Indicadores).
 * Remove a medição pertencente ao titular autenticado.
 */
export class ExcluirMedicao {
  constructor(private readonly repositorio: RepositorioMedicoes) {}

  async executar(medicaoId: string, titularId: string): Promise<void> {
    const removida = await this.repositorio.excluir(medicaoId, titularId);
    if (!removida) {
      throw new RecursoIndisponivelErro();
    }
  }
}
