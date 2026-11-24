/**
 * O que sai para o Provedor de notificações (ADR 04): só os tokens de
 * entrega dos aparelhos, uma referência técnica e uma mensagem genérica.
 * Nome, e-mail, título e notas do lembrete não saem do sistema.
 */
export interface Notice {
  /** Referência técnica do aviso. */
  deliveryId: string;
  /** Lembrete + versão (ADR 03): reenvios da mesma versão usam a mesma chave. */
  idempotencyKey: string;
  /** Tokens de entrega dos aparelhos com sessão ativa do titular. */
  destinations: string[];
  message: string;
}

/** Porta para o Provedor de notificações (serviço externo). */
export interface NotificationProvider {
  send(notice: Notice): Promise<void>;
}
