import {
  EntregaRecusadaErro,
  PedidoDeEntrega,
  ProvedorDeNotificacoes,
} from '../portas/provedor-de-notificacoes';

/**
 * Provedor externo via HTTP. A chave vai no cabeçalho Idempotency-Key: se a
 * resposta se perder e o pedido for repetido, um provedor com suporte a
 * idempotência descarta a duplicata (ADR 03).
 */
export class ProvedorHttp implements ProvedorDeNotificacoes {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly tempoLimiteSegundos: number,
  ) {
    if (!url) {
      throw new Error('PROVEDOR_NOTIFICACOES_URL é obrigatório para o provedor http.');
    }
  }

  async enviar(pedido: PedidoDeEntrega): Promise<void> {
    const resposta = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': pedido.chave,
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(pedido),
      signal: AbortSignal.timeout(this.tempoLimiteSegundos * 1000),
    });

    if (resposta.ok) {
      return;
    }
    const repetivel = resposta.status >= 500 || resposta.status === 408 || resposta.status === 429;
    const motivo = `Provedor respondeu ${resposta.status}`;
    throw repetivel ? new Error(motivo) : new EntregaRecusadaErro(motivo);
  }
}
