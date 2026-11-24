export interface OcorrenciaDose {
  id: string;
  tratamentoId: string;
  titularId: string;
  instantePrevisto: Date;
  estado: 'DESCONHECIDA' | 'CONFIRMADA' | 'PULADA' | 'CANCELADA';
  versao: number;
}
