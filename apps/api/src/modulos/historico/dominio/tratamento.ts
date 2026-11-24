import { randomUUID } from 'node:crypto';
import { TreatmentChanged, TreatmentEnded } from '@personal-health/contracts';
import { RegraVioladaErro } from '../../../compartilhado/dominio/erros';
import { FrequenciaTratamento } from './frequencia-tratamento';

export interface DadosTratamento {
  id: string;
  titularId: string;
  medicamento: string;
  dose: string;
  formaAdministracao: string;
  frequencia: FrequenciaTratamento;
  dataInicio: Date;
  dataFim: Date | null;
  horarioInicial: string | null;
  registradoEm: Date;
  versao: number;
}

export interface NovoTratamento {
  id?: string;
  titularId: string;
  medicamento: string;
  dose: string;
  formaAdministracao: string;
  frequencia: FrequenciaTratamento;
  dataInicio: Date;
  dataFim?: Date | null;
  horarioInicial?: string | null;
}

export type AlteracaoTratamento = Partial<
  Pick<
    DadosTratamento,
    | 'medicamento'
    | 'dose'
    | 'formaAdministracao'
    | 'frequencia'
    | 'dataInicio'
    | 'dataFim'
    | 'horarioInicial'
  >
>;

export class Tratamento {
  private constructor(private readonly dados: DadosTratamento) {}

  static registrar(novo: NovoTratamento, agora: Date): Tratamento {
    return new Tratamento(
      Tratamento.validar({
        id: novo.id ?? randomUUID(),
        titularId: novo.titularId,
        medicamento: novo.medicamento,
        dose: novo.dose,
        formaAdministracao: novo.formaAdministracao,
        frequencia: novo.frequencia,
        dataInicio: novo.dataInicio,
        dataFim: novo.dataFim ?? null,
        horarioInicial: novo.horarioInicial ?? null,
        registradoEm: agora,
        versao: 1,
      }),
    );
  }

  static restaurar(dados: DadosTratamento): Tratamento {
    return new Tratamento({ ...dados });
  }

  alterar(alteracao: AlteracaoTratamento): Tratamento {
    return new Tratamento(Tratamento.validar({ ...this.dados, ...alteracao, versao: this.dados.versao + 1 }));
  }

  encerrar(dataFim: Date): Tratamento {
    if (this.dados.dataFim) throw new RegraVioladaErro('O tratamento já foi encerrado.');
    return this.alterar({ dataFim });
  }

  eventoAlterado(ocorridoEm: Date): TreatmentChanged {
    const dados = this.dados;
    return {
      type: 'TreatmentChanged',
      originId: dados.id,
      holderId: dados.titularId,
      version: dados.versao,
      frequency: frequenciaDoEvento(dados.frequencia),
      startsAt: dados.dataInicio,
      endsAt: dados.dataFim,
      initialTime: dados.horarioInicial,
      occurredAt: ocorridoEm,
      eventId: randomUUID(),
    };
  }

  eventoEncerrado(ocorridoEm: Date): TreatmentEnded {
    if (!this.dados.dataFim) throw new RegraVioladaErro('Encerre o tratamento antes de publicar o evento.');
    return {
      type: 'TreatmentEnded',
      originId: this.dados.id,
      holderId: this.dados.titularId,
      version: this.dados.versao,
      endedAt: this.dados.dataFim,
      occurredAt: ocorridoEm,
      eventId: randomUUID(),
    };
  }

  get id(): string {
    return this.dados.id;
  }

  get titularId(): string {
    return this.dados.titularId;
  }

  paraLeitura(): DadosTratamento {
    return { ...this.dados };
  }

  private static validar(dados: DadosTratamento): DadosTratamento {
    if (!dados.medicamento.trim() || !dados.dose.trim() || !dados.formaAdministracao.trim()) {
      throw new RegraVioladaErro('Informe medicamento, dose e forma de administração.');
    }
    if (Number.isNaN(dados.dataInicio.getTime()) || (dados.dataFim && Number.isNaN(dados.dataFim.getTime()))) {
      throw new RegraVioladaErro('Informe datas válidas para o tratamento.');
    }
    if (dados.dataFim && dados.dataFim.getTime() < dados.dataInicio.getTime()) {
      throw new RegraVioladaErro('A data final não pode anteceder o início do tratamento.');
    }
    if (dados.frequencia.tipo === 'FIXA' && !dados.horarioInicial) {
      throw new RegraVioladaErro('A frequência fixa exige um horário inicial.');
    }
    if (dados.frequencia.tipo === 'SOB_DEMANDA' && dados.horarioInicial) {
      throw new RegraVioladaErro('A frequência sob demanda não possui horário inicial.');
    }
    if (dados.horarioInicial && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dados.horarioInicial)) {
      throw new RegraVioladaErro('O horário inicial deve estar no formato HH:mm.');
    }
    return {
      ...dados,
      medicamento: dados.medicamento.trim(),
      dose: dados.dose.trim(),
      formaAdministracao: dados.formaAdministracao.trim(),
    };
  }
}

function frequenciaDoEvento(
  frequencia: FrequenciaTratamento,
): TreatmentChanged['frequency'] {
  const dados = frequencia.paraLeitura();
  if (dados.tipo === 'SOB_DEMANDA') return { type: 'SOB_DEMANDA' };
  if (dados.intervaloHoras === null) {
    throw new RegraVioladaErro('A frequência fixa exige um intervalo em horas.');
  }
  return { type: 'FIXA', intervalHours: dados.intervaloHoras };
}
