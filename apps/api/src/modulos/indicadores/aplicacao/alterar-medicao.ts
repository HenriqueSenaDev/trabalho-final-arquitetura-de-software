import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { Relogio } from '../../../compartilhado/portas/relogio';
import { Medicao, ValorMedicao } from '../dominio/medicao';
import { RepositorioMedicoes } from '../portas/repositorio-medicoes';

export interface ComandoAlterarMedicao {
  valor?: ValorMedicao;
  dataHora?: Date;
}

/**
 * Caso de uso: AlterarMedicao (C4 nível 4 do componente Indicadores).
 * Permite retificar valores e instantes de uma medição registrada.
 */
export class AlterarMedicao {
  constructor(
    private readonly repositorio: RepositorioMedicoes,
    private readonly relogio: Relogio,
  ) {}

  async executar(
    medicaoId: string,
    comando: ComandoAlterarMedicao,
    titularId: string,
  ): Promise<Medicao> {
    const medicao = await this.repositorio.buscarPorId(medicaoId, titularId);
    if (!medicao) {
      throw new RecursoIndisponivelErro();
    }

    const agora = this.relogio.agora();
    const alterada = medicao.alterar(comando, agora);

    await this.repositorio.salvar(alterada);
    return alterada;
  }
}
