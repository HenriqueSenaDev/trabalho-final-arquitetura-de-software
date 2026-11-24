export type EstadoAgendamento = 'PENDENTE' | 'ENVIADO' | 'CANCELADO' | 'FALHOU';

/** Agendamento que este processo reservou, com a versão vista na reserva. */
export interface AgendamentoReservado {
  id: string;
  titularId: string;
  versao: number;
  /** Tentativas já contando a atual. */
  tentativas: number;
  /**
   * Identificador desta reserva. Se o prazo vencer e outra réplica reservar o
   * mesmo agendamento, a reserva muda e esta réplica perde o direito de enviar.
   */
  reserva: string;
}

/**
 * Porta de saída para os agendamentos duráveis (ADR 03). Todas as escritas
 * são condicionadas à versão e à reserva: se o titular reagendou ou cancelou,
 * ou se outra réplica assumiu o agendamento, a escrita não acontece.
 */
export interface RepositorioDeAgendamentos {
  /**
   * Reserva agendamentos PENDENTES cujo instante chegou e que nenhuma outra
   * réplica está segurando. Cada reserva conta uma tentativa.
   */
  reservarDevidos(limite: number, reservaSegundos: number): Promise<AgendamentoReservado[]>;

  /**
   * Imediatamente antes do envio: confirma que o agendamento continua
   * pendente, na versão reservada e com a reserva desta réplica, ainda no
   * prazo, e estende o prazo. false = não enviar.
   */
  renovarReserva(reservado: AgendamentoReservado, reservaSegundos: number): Promise<boolean>;

  /** Marca ENVIADO. Retorna false se a versão ou a reserva deixaram de valer. */
  concluir(reservado: AgendamentoReservado): Promise<boolean>;

  /** Falha transitória: libera o agendamento para nova tentativa depois da espera. */
  adiar(reservado: AgendamentoReservado, erro: string, esperaSegundos: number): Promise<void>;

  /** Falha definitiva: o agendamento fica FALHOU, com o motivo, para diagnóstico. */
  falhar(reservado: AgendamentoReservado, erro: string): Promise<void>;
}
