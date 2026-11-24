export interface RespostaDose {
  ocorrenciaId: string;
  titularId: string;
  resposta: 'CONFIRMADA' | 'PULADA';
  respondidaEm: Date;
}
