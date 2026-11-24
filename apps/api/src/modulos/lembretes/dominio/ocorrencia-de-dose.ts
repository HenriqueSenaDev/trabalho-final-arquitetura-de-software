export type EstadoOcorrenciaDose = 'DESCONHECIDA' | 'CONFIRMADA' | 'PULADA' | 'CANCELADA';

export class OcorrenciaDeDose {
  constructor(
    public id: string,
    public tratamentoId: string,
    public titularId: string,
    public instantePrevisto: Date,
    public estado: EstadoOcorrenciaDose,
    public versao: number,
  ) {}

  confirmar(): void {
    this.estado = 'CONFIRMADA';
  }

  marcarComoPulada(): void {
    this.estado = 'PULADA';
  }

  cancelar(): void {
    this.estado = 'CANCELADA';
    this.versao++;
  }
}
