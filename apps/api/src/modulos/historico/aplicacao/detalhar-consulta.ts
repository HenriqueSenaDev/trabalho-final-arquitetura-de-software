import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { AvisoDeConsulta, ContratoLembretes } from '../../lembretes/contrato';
import { DadosConsulta } from '../dominio/consulta';
import { RepositorioConsultas } from '../portas/repositorio-consultas';

export interface DetalheDaConsulta extends DadosConsulta {
  aviso: AvisoDeConsulta | null;
}

/** Caso de uso: abre o detalhe de um item da linha do tempo, com a situação do aviso. */
export class DetalharConsulta {
  constructor(
    private readonly consultas: RepositorioConsultas,
    private readonly lembretes: ContratoLembretes,
  ) {}

  async executar(pedido: { titularId: string; id: string }): Promise<DetalheDaConsulta> {
    const consulta = await this.consultas.buscar(pedido.titularId, pedido.id);
    if (!consulta) {
      throw new RecursoIndisponivelErro();
    }
    const aviso = await this.lembretes.avisoDaConsulta({
      titularId: pedido.titularId,
      consultaId: pedido.id,
    });
    return { ...consulta.paraLeitura(), aviso };
  }
}
