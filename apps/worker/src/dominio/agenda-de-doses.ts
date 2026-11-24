import { OcorrenciaDose } from './ocorrencia-de-dose';

export interface TratamentoParaAgenda {
  id: string;
  frequencia: 'FIXA' | 'SOB_DEMANDA';
}

export class AgendaDeDoses {
  gerarOcorrencias(
    tratamento: TratamentoParaAgenda,
    _periodo: { inicio: Date; fim: Date },
  ): OcorrenciaDose[] {
    if (tratamento.frequencia === 'SOB_DEMANDA') return [];
    throw new Error('Geração de doses ainda não implementada.');
  }
}
