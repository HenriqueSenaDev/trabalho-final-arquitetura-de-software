import { PedidoDeEntrega, ProvedorDeNotificacoes } from '../portas/provedor-de-notificacoes';
import { Registro } from '../portas/registro';

/** Provedor de desenvolvimento: registra no log o que seria enviado. */
export class ProvedorConsole implements ProvedorDeNotificacoes {
  constructor(private readonly registro: Registro) {}

  async enviar(pedido: PedidoDeEntrega): Promise<void> {
    this.registro.info('Provedor console recebeu o aviso', {
      chave: pedido.chave,
      destinos: pedido.destinos.length,
      texto: pedido.mensagem,
    });
  }
}
