/**
 * Porta de saída para os destinos de notificação do titular: os tokens de
 * entrega dos aparelhos com sessão ativa. Sessão revogada não aparece aqui,
 * então o aparelho perdido deixa de receber avisos (ADR 04).
 */
export interface DestinosDeNotificacao {
  ativosDoTitular(titularId: string): Promise<string[]>;
}
