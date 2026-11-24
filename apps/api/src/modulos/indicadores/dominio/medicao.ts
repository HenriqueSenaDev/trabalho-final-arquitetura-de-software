import { randomUUID } from 'node:crypto';
import { RegraVioladaErro } from '../../../compartilhado/dominio/erros';

export const TIPOS_DE_MEDICAO = ['PESO', 'PRESSAO_ARTERIAL', 'GLICEMIA'] as const;
export type TipoMedicao = (typeof TIPOS_DE_MEDICAO)[number];

export type ContextoGlicemia = 'JEJUM' | 'POS_REFEICAO';

/**
 * Abstração base para valores de medição de saúde.
 */
export abstract class ValorMedicaoBase {
  abstract readonly tipo: TipoMedicao;
  abstract readonly unidade: string;
}

/**
 * Medição de Peso corporal em quilogramas (kg).
 */
export class Peso extends ValorMedicaoBase {
  readonly tipo = 'PESO' as const;
  readonly unidade = 'kg' as const;

  constructor(readonly valor: number) {
    super();
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
      throw new RegraVioladaErro('O valor do peso deve ser um número positivo.');
    }
  }
}

/**
 * Medição de Pressão Arterial em milímetros de mercúrio (mmHg).
 * Os dois valores (sistólica e diastólica) representam uma única medição.
 */
export class PressaoArterial extends ValorMedicaoBase {
  readonly tipo = 'PRESSAO_ARTERIAL' as const;
  readonly unidade = 'mmHg' as const;

  constructor(
    readonly sistolica: number,
    readonly diastolica: number,
  ) {
    super();
    if (
      typeof sistolica !== 'number' ||
      !Number.isFinite(sistolica) ||
      sistolica <= 0 ||
      typeof diastolica !== 'number' ||
      !Number.isFinite(diastolica) ||
      diastolica <= 0
    ) {
      throw new RegraVioladaErro(
        'Os valores de pressão sistólica e diastólica devem ser números positivos.',
      );
    }
    if (sistolica <= diastolica) {
      throw new RegraVioladaErro('A pressão sistólica deve ser maior que a diastólica.');
    }
  }
}

/**
 * Medição de Glicemia em mg/dL, com contexto de jejum ou pós-refeição.
 */
export class Glicemia extends ValorMedicaoBase {
  readonly tipo = 'GLICEMIA' as const;
  readonly unidade = 'mg/dL' as const;

  constructor(
    readonly valor: number,
    readonly contexto: ContextoGlicemia,
  ) {
    super();
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
      throw new RegraVioladaErro('O valor da glicemia deve ser um número positivo.');
    }
    if (contexto !== 'JEJUM' && contexto !== 'POS_REFEICAO') {
      throw new RegraVioladaErro('O contexto da glicemia deve ser JEJUM ou POS_REFEICAO.');
    }
  }
}

/** Tipo discriminado dos valores possíveis de uma medição. */
export type ValorMedicao = Peso | PressaoArterial | Glicemia;

export interface DadosMedicao {
  id: string;
  titularId: string;
  tipo: TipoMedicao;
  valor: ValorMedicao;
  dataHora: Date;
  registradoEm: Date;
}

export interface NovaMedicao {
  id?: string;
  titularId: string;
  tipo: TipoMedicao;
  valor: ValorMedicao;
  dataHora: Date;
}

export interface AlteracaoMedicao {
  valor?: ValorMedicao;
  dataHora?: Date;
}

/**
 * Agregado Medicao (C4 nível 4 do componente Indicadores):
 * Representa uma medição individual de saúde com identidade, titular e valor tipado.
 * Regra invariante: medições não podem possuir data futura.
 */
export class Medicao {
  private constructor(private readonly dados: DadosMedicao) {}

  static registrar(nova: NovaMedicao, agora: Date): Medicao {
    if (nova.dataHora.getTime() > agora.getTime()) {
      throw new RegraVioladaErro('A medição não pode possuir data futura.');
    }
    if (!nova.titularId) {
      throw new RegraVioladaErro('Informe o titular da medição.');
    }
    if (nova.tipo !== nova.valor.tipo) {
      throw new RegraVioladaErro('O tipo da medição não coincide com o valor informado.');
    }

    return new Medicao({
      id: nova.id ?? randomUUID(),
      titularId: nova.titularId,
      tipo: nova.tipo,
      valor: nova.valor,
      dataHora: nova.dataHora,
      registradoEm: agora,
    });
  }

  static restaurar(dados: DadosMedicao): Medicao {
    return new Medicao({ ...dados });
  }

  alterar(alteracao: AlteracaoMedicao, agora: Date): Medicao {
    const dataHora = alteracao.dataHora ?? this.dados.dataHora;
    if (dataHora.getTime() > agora.getTime()) {
      throw new RegraVioladaErro('A medição não pode possuir data futura.');
    }
    const valor = alteracao.valor ?? this.dados.valor;
    if (valor.tipo !== this.dados.tipo) {
      throw new RegraVioladaErro('O tipo do novo valor não coincide com o tipo da medição.');
    }

    return new Medicao({
      ...this.dados,
      valor,
      dataHora,
    });
  }

  get id(): string {
    return this.dados.id;
  }

  get titularId(): string {
    return this.dados.titularId;
  }

  get tipo(): TipoMedicao {
    return this.dados.tipo;
  }

  get valor(): ValorMedicao {
    return this.dados.valor;
  }

  get dataHora(): Date {
    return this.dados.dataHora;
  }

  get registradoEm(): Date {
    return this.dados.registradoEm;
  }

  paraLeitura(): DadosMedicao {
    return { ...this.dados };
  }
}
