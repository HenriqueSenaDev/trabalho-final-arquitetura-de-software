import { Medicao } from '../dominio/medicao';
import { FiltrosMedicao, RepositorioMedicoes } from '../portas/repositorio-medicoes';

/**
 * Caso de uso: ConsultarMedicoes (C4 nível 4 do componente Indicadores).
 * Lista as medições registradas com suporte a filtros por tipo e intervalo temporal.
 */
export class ConsultarMedicoes {
  constructor(private readonly repositorio: RepositorioMedicoes) {}

  async executar(filtros: FiltrosMedicao, titularId: string): Promise<Medicao[]> {
    return this.repositorio.listar(filtros, titularId);
  }
}
