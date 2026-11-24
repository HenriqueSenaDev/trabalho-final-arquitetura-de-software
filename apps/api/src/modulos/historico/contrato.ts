/** Public read-model types shared with the Timeline component. */
export interface ExameNaLinhaDoTempo {
  id: string;
  titularId: string;
  tipo: string;
  dataRealizacao: Date;
}

export interface TratamentoNaLinhaDoTempo {
  id: string;
  titularId: string;
  medicamento: string;
  dataInicio: Date;
  dataFim: Date | null;
}
