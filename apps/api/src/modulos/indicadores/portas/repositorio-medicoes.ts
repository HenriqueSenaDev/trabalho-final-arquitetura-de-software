import { Medicao, TipoMedicao } from '../dominio/medicao';

export interface FiltrosMedicao {
  tipo?: TipoMedicao;
  de?: Date;
  ate?: Date;
}

/**
 * Porta de saída RepositorioMedicoes (C4 nível 4):
 * Persistência e recuperação do agregado Medicao isolado por titular (ADR 04).
 */
export abstract class RepositorioMedicoes {
  abstract salvar(medicao: Medicao): Promise<void>;
  abstract buscarPorId(id: string, titularId: string): Promise<Medicao | null>;
  abstract listar(filtros: FiltrosMedicao, titularId: string): Promise<Medicao[]>;
  abstract excluir(id: string, titularId: string): Promise<boolean>;
}
