import { TipoMedicao, ValorMedicao } from './dominio/medicao';

export { TipoMedicao, ValorMedicao };

export interface ResumoMedicao {
  id: string;
  titularId: string;
  tipo: TipoMedicao;
  valor: ValorMedicao;
  dataHora: Date;
}

/**
 * Contrato público do módulo Indicadores (ADR 01).
 * Único arquivo deste módulo que outros módulos de negócio podem importar.
 */
export abstract class ContratoIndicadores {
  /** Recupera as medições mais recentes do titular. */
  abstract obterUltimasMedicoes(titularId: string, limite?: number): Promise<ResumoMedicao[]>;
}
