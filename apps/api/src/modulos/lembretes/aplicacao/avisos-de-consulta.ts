import { Relogio } from '../../../compartilhado/portas/relogio';
import {
  AvisoDeConsulta,
  ContratoLembretes,
  PedidoDeAvisoDeConsulta,
  ReferenciaDeConsulta,
} from '../contrato';
import { Agendamento } from '../dominio/agendamento';
import { RepositorioAgendamentos } from '../portas/repositorio-agendamentos';

/**
 * Casos de uso que implementam o contrato público do módulo. Só gravam o
 * agendamento: a entrega fica com o Processador de lembretes, em outro processo.
 * Toda busca é por titular, então Lembretes também valida a titularidade.
 */
export class AvisosDeConsulta extends ContratoLembretes {
  constructor(
    private readonly agendamentos: RepositorioAgendamentos,
    private readonly relogio: Relogio,
  ) {
    super();
  }

  async agendarAvisoDeConsulta(pedido: PedidoDeAvisoDeConsulta): Promise<AvisoDeConsulta> {
    const agora = this.relogio.agora();
    const existente = await this.buscar(pedido);
    const agendamento = existente ?? Agendamento.paraConsulta(pedido, agora);
    if (existente) {
      existente.reagendar(pedido.instante, agora);
    }
    await this.agendamentos.salvar(agendamento);
    return paraAviso(agendamento);
  }

  async cancelarAvisoDeConsulta(referencia: ReferenciaDeConsulta): Promise<void> {
    const existente = await this.buscar(referencia);
    if (existente?.cancelar()) {
      await this.agendamentos.salvar(existente);
    }
  }

  async avisoDaConsulta(referencia: ReferenciaDeConsulta): Promise<AvisoDeConsulta | null> {
    const existente = await this.buscar(referencia);
    return existente ? paraAviso(existente) : null;
  }

  private buscar(referencia: ReferenciaDeConsulta): Promise<Agendamento | null> {
    return this.agendamentos.buscarPorOrigem(referencia.titularId, {
      tipo: 'CONSULTA',
      id: referencia.consultaId,
    });
  }
}

function paraAviso(agendamento: Agendamento): AvisoDeConsulta {
  const { instante, estado, versao } = agendamento.paraGravacao();
  return { instante, estado, versao };
}
