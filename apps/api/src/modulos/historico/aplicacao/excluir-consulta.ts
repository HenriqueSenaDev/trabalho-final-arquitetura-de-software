import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { UnidadeDeTrabalho } from '../../../compartilhado/portas/unidade-de-trabalho';
import { ContratoLembretes } from '../../lembretes/contrato';
import { RepositorioConsultas } from '../portas/repositorio-consultas';

/**
 * Caso de uso ExcluirConsulta (RF1.1): remove a consulta e o retorno
 * associado e cancela o aviso pendente, tudo na mesma transação.
 */
export class ExcluirConsulta {
  constructor(
    private readonly consultas: RepositorioConsultas,
    private readonly lembretes: ContratoLembretes,
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
  ) {}

  async executar(pedido: { titularId: string; id: string }): Promise<void> {
    await this.unidadeDeTrabalho.executar(async () => {
      if (!(await this.consultas.excluir(pedido.titularId, pedido.id))) {
        throw new RecursoIndisponivelErro();
      }
      await this.lembretes.cancelarAvisoDeConsulta({
        titularId: pedido.titularId,
        consultaId: pedido.id,
      });
    });
  }
}
