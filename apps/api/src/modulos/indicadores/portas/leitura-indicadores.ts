export interface PeriodoConsulta {
  de?: Date;
  ate?: Date;
}

export interface PontoEvolucao {
  dataHora: Date;
  valor: unknown;
  unidade: string;
}

export interface EvolucaoIndicador {
  tipo: string;
  titularId: string;
  periodo: PeriodoConsulta;
  pontos: PontoEvolucao[];
}

/**
 * Porta de leitura de Indicadores (C4 nível 4):
 * Recuperação de séries cronológicas de medições por indicador e período,
 * sem realizar diagnósticos ou interpretação clínica médica.
 */
export abstract class LeituraIndicadores {
  abstract consultarEvolucao(
    tipo: string,
    periodo: PeriodoConsulta,
    titularId: string,
  ): Promise<EvolucaoIndicador>;
}
