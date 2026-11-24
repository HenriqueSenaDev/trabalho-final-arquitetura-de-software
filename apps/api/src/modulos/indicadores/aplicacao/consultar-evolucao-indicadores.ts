import {
  EvolucaoIndicador,
  LeituraIndicadores,
  PeriodoConsulta,
} from '../portas/leitura-indicadores';

/**
 * Caso de uso: ConsultarEvolucaoIndicadores (C4 nível 4 do componente Indicadores).
 * Recupera uma série cronológica de medições para acompanhamento da evolução temporal,
 * sem realizar diagnósticos ou interpretação clínica médica.
 */
export class ConsultarEvolucaoIndicadores {
  constructor(private readonly leitura: LeituraIndicadores) {}

  async executar(
    tipo: string,
    periodo: PeriodoConsulta,
    titularId: string,
  ): Promise<EvolucaoIndicador> {
    return this.leitura.consultarEvolucao(tipo, periodo, titularId);
  }
}
