import { OcorrenciaDeDose } from './ocorrencia-de-dose';

export interface TratamentoParaAgenda {
  id: string;
  titularId: string;
  frequencia: 'FIXA' | 'SOB_DEMANDA';
  intervaloMinutos?: number;
  primeiraDose?: Date;
}

export interface PeriodoDeAgenda {
  inicio: Date;
  fim: Date;
}

export class AgendaDeDoses {
  gerarOcorrencias(
    tratamento: TratamentoParaAgenda,
    _periodo: PeriodoDeAgenda,
  ): OcorrenciaDeDose[] {
    if (tratamento.frequencia === 'SOB_DEMANDA') return [];
    throw new Error('Geração de ocorrências ainda não implementada.');
  }
}
