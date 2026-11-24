import { RegraVioladaErro } from '../../../compartilhado/dominio/erros';

export type TipoFrequencia = 'FIXA' | 'SOB_DEMANDA';

export class FrequenciaTratamento {
  private constructor(
    readonly tipo: TipoFrequencia,
    readonly intervaloHoras: number | null,
  ) {}

  static fixa(intervaloHoras: number): FrequenciaTratamento {
    if (!Number.isInteger(intervaloHoras) || intervaloHoras < 1) {
      throw new RegraVioladaErro('O intervalo fixo deve ser um inteiro positivo.');
    }
    return new FrequenciaTratamento('FIXA', intervaloHoras);
  }

  static sobDemanda(): FrequenciaTratamento {
    return new FrequenciaTratamento('SOB_DEMANDA', null);
  }

  static restaurar(tipo: TipoFrequencia, intervaloHoras: number | null): FrequenciaTratamento {
    if (tipo === 'FIXA' && intervaloHoras !== null) return FrequenciaTratamento.fixa(intervaloHoras);
    if (tipo === 'SOB_DEMANDA' && intervaloHoras === null) return FrequenciaTratamento.sobDemanda();
    throw new RegraVioladaErro('A frequência informada é inválida.');
  }

  paraLeitura(): { tipo: TipoFrequencia; intervaloHoras: number | null } {
    return { tipo: this.tipo, intervaloHoras: this.intervaloHoras };
  }
}
