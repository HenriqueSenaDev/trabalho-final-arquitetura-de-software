/**
 * Contrato público do módulo Lembretes, usado pelo Histórico. É o único
 * arquivo do módulo que outros módulos podem importar.
 *
 * Quem altera deve estar dentro de uma UnidadeDeTrabalho: o agendamento é
 * confirmado na mesma transação da consulta (C3: "alterações relevantes na
 * consulta revisam os agendamentos na mesma transação").
 */
export type EstadoDoAviso = 'PENDENTE' | 'ENVIADO' | 'CANCELADO' | 'FALHOU';

export type TipoEventoLembretes =
  | 'ConsultationChanged'
  | 'ConsultationDeleted'
  | 'TreatmentChanged'
  | 'TreatmentEnded'
  | 'ReminderChanged'
  | 'ReminderCancelled';

export interface EventoLembretes {
  id: string;
  tipo: TipoEventoLembretes;
  origemId: string;
  titularId: string;
  versao: number;
  ocorridoEm: Date;
}

export type ConsultationChanged = EventoLembretes & { tipo: 'ConsultationChanged' };
export type ConsultationDeleted = EventoLembretes & { tipo: 'ConsultationDeleted' };
export type TreatmentChanged = EventoLembretes & { tipo: 'TreatmentChanged' };
export type TreatmentEnded = EventoLembretes & { tipo: 'TreatmentEnded' };
export type ReminderChanged = EventoLembretes & { tipo: 'ReminderChanged' };
export type ReminderCancelled = EventoLembretes & { tipo: 'ReminderCancelled' };

export interface AvisoDeConsulta {
  instante: Date;
  estado: EstadoDoAviso;
  /** Cresce a cada reagendamento ou cancelamento (ADR 03). */
  versao: number;
}

export interface ReferenciaDeConsulta {
  titularId: string;
  consultaId: string;
}

export interface PedidoDeAvisoDeConsulta extends ReferenciaDeConsulta {
  instante: Date;
}

export abstract class ContratoLembretes {
  /**
   * Agenda o aviso da consulta. Se ela já tem um, reagenda: grava uma nova
   * versão pendente e a anterior deixa de ser elegível para entrega.
   */
  abstract agendarAvisoDeConsulta(pedido: PedidoDeAvisoDeConsulta): Promise<AvisoDeConsulta>;

  /** Cancela o aviso pendente (nova versão, CANCELADO). Sem aviso pendente, nada muda. */
  abstract cancelarAvisoDeConsulta(referencia: ReferenciaDeConsulta): Promise<void>;

  /** Situação atual do aviso da consulta do titular, ou null se nunca houve aviso. */
  abstract avisoDaConsulta(referencia: ReferenciaDeConsulta): Promise<AvisoDeConsulta | null>;
}
