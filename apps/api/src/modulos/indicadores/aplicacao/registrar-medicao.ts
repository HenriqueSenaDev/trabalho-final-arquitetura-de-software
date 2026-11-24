import { Relogio } from '../../../compartilhado/portas/relogio';
import { Medicao, TipoMedicao, ValorMedicao } from '../dominio/medicao';
import { RepositorioMedicoes } from '../portas/repositorio-medicoes';

export interface ComandoRegistrarMedicao {
  id?: string;
  tipo: TipoMedicao;
  valor: ValorMedicao;
  dataHora: Date;
}

/**
 * Caso de uso: RegistrarMedicao (C4 nível 4 do componente Indicadores).
 * Aplica as invariantes do domínio (como recusa a data futura) e persiste a medição.
 */
export class RegistrarMedicao {
  constructor(
    private readonly repositorio: RepositorioMedicoes,
    private readonly relogio: Relogio,
  ) {}

  async executar(comando: ComandoRegistrarMedicao, titularId: string): Promise<Medicao> {
    const agora = this.relogio.agora();
    const medicao = Medicao.registrar(
      {
        id: comando.id,
        titularId,
        tipo: comando.tipo,
        valor: comando.valor,
        dataHora: comando.dataHora,
      },
      agora,
    );

    await this.repositorio.salvar(medicao);
    return medicao;
  }
}
