/**
 * O que sai para o provedor externo (ADR 04): token de entrega, referência
 * técnica e mensagem genérica. Nada de nome, e-mail ou conteúdo clínico.
 */
export interface PedidoDeEntrega {
  /** Chave do agendamento + versão; o provedor usa para deduplicar (ADR 03). */
  chave: string;
  destinos: string[];
  mensagem: string;
}

/**
 * Porta de saída para o Provedor de notificações. Trocar de provedor é
 * trocar o adaptador; o caso de uso não muda (cenário de modificabilidade).
 */
export interface ProvedorDeNotificacoes {
  enviar(pedido: PedidoDeEntrega): Promise<void>;
}

/** O provedor recusou o pedido de forma definitiva (não adianta repetir). */
export class EntregaRecusadaErro extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'EntregaRecusadaErro';
  }
}
