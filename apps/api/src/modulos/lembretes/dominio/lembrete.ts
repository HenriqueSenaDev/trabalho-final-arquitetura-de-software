export class Lembrete {
  constructor(
    public id: string,
    public titularId: string,
    public origemId: string,
    public tipoOrigem: string,
    public antecedenciaMinutos: number,
    public ativo: boolean,
    public versao: number,
  ) {}

  configurar(antecedenciaMinutos: number): void {
    this.antecedenciaMinutos = antecedenciaMinutos;
    this.ativo = true;
    this.versao++;
  }

  reagendar(antecedenciaMinutos: number): void {
    this.configurar(antecedenciaMinutos);
  }

  cancelar(): void {
    this.ativo = false;
    this.versao++;
  }
}
