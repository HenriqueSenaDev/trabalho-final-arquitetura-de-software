import { AgendamentoReservado, RepositorioDeAgendamentos } from '../portas/agendamentos';
import { DestinosDeNotificacao } from '../portas/destinos';
import { EntregaRecusadaErro, ProvedorDeNotificacoes } from '../portas/provedor-de-notificacoes';
import { Registro } from '../portas/registro';

/** RF4: a notificação exibe texto genérico. */
export const MENSAGEM_GENERICA =
  'Você tem um compromisso de saúde em breve. Abra o PersonalHealth para ver os detalhes.';

export interface ConfiguracaoDaEntrega {
  lote: number;
  reservaSegundos: number;
  maxTentativas: number;
  esperaBaseSegundos: number;
}

/**
 * Caso de uso do Processador de lembretes (ADR 03): agendamento durável
 * separado da entrega. A cada ciclo:
 *
 *   1. reserva só os agendamentos elegíveis (pendentes, vencidos, livres);
 *   2. imediatamente antes de cada envio, revalida estado, versão e posse da
 *      reserva e estende o prazo; o lote é processado em sequência, então
 *      sem isso a reserva dos últimos itens podia vencer, outra réplica
 *      assumir e as duas enviarem o mesmo aviso;
 *   3. envia ao provedor usando agendamento + versão como chave;
 *   4. persiste o resultado: enviado, nova tentativa ou falha definitiva.
 *
 * Roda em processo separado da API: se o provedor cair, registrar e ler
 * consultas continua funcionando (cenário de disponibilidade).
 */
export class EntregarAvisosDevidos {
  constructor(
    private readonly agendamentos: RepositorioDeAgendamentos,
    private readonly destinos: DestinosDeNotificacao,
    private readonly provedor: ProvedorDeNotificacoes,
    private readonly configuracao: ConfiguracaoDaEntrega,
    private readonly registro: Registro,
  ) {}

  /** Executa um ciclo e devolve quantos agendamentos foram reservados. */
  async executarCiclo(): Promise<number> {
    const reservados = await this.agendamentos.reservarDevidos(
      this.configuracao.lote,
      this.configuracao.reservaSegundos,
    );
    for (const reservado of reservados) {
      await this.entregar(reservado);
    }
    return reservados.length;
  }

  private async entregar(reservado: AgendamentoReservado): Promise<void> {
    const aindaReservado = await this.agendamentos.renovarReserva(
      reservado,
      this.configuracao.reservaSegundos,
    );
    if (!aindaReservado) {
      this.registro.info('Versão substituída, cancelada ou reservada por outra réplica: aviso ignorado', {
        agendamento: reservado.id,
        versaoReservada: reservado.versao,
      });
      return;
    }

    const destinos = await this.destinos.ativosDoTitular(reservado.titularId);
    if (destinos.length === 0) {
      await this.agendamentos.falhar(reservado, 'Titular sem aparelho ativo para notificação.');
      return;
    }

    try {
      await this.provedor.enviar({
        chave: `${reservado.id}:v${reservado.versao}`,
        destinos,
        mensagem: MENSAGEM_GENERICA,
      });
    } catch (erro) {
      await this.registrarFalha(reservado, erro);
      return;
    }

    const concluido = await this.agendamentos.concluir(reservado);
    if (!concluido) {
      // Janela aceita no ADR 03: o titular reagendou ou cancelou enquanto o
      // provedor já aceitava o aviso desta versão.
      this.registro.aviso('Aviso aceito pelo provedor depois que o agendamento mudou', {
        agendamento: reservado.id,
        versaoReservada: reservado.versao,
      });
      return;
    }
    this.registro.info('Aviso entregue ao provedor', {
      agendamento: reservado.id,
      versao: reservado.versao,
    });
  }

  private async registrarFalha(reservado: AgendamentoReservado, erro: unknown): Promise<void> {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    const definitiva =
      erro instanceof EntregaRecusadaErro ||
      reservado.tentativas >= this.configuracao.maxTentativas;

    if (definitiva) {
      await this.agendamentos.falhar(reservado, motivo);
      this.registro.erro('Falha definitiva na entrega do aviso', {
        agendamento: reservado.id,
        tentativas: reservado.tentativas,
        motivo,
      });
      return;
    }

    const espera = this.configuracao.esperaBaseSegundos * 2 ** (reservado.tentativas - 1);
    await this.agendamentos.adiar(reservado, motivo, espera);
    this.registro.aviso('Falha transitória: nova tentativa agendada', {
      agendamento: reservado.id,
      tentativas: reservado.tentativas,
      esperaSegundos: espera,
      motivo,
    });
  }
}
