import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  EntregarAvisosDevidos,
  MENSAGEM_GENERICA,
} from '../../src/aplicacao/entregar-avisos-devidos';
import {
  AgendamentoReservado,
  EstadoAgendamento,
  RepositorioDeAgendamentos,
} from '../../src/portas/agendamentos';
import {
  EntregaRecusadaErro,
  PedidoDeEntrega,
  ProvedorDeNotificacoes,
} from '../../src/portas/provedor-de-notificacoes';
import { Registro } from '../../src/portas/registro';

// Adaptadores em memória: o caso de uso roda sem banco e sem provedor real.

interface AgendamentoEmMemoria {
  id: string;
  titularId: string;
  estado: EstadoAgendamento;
  versao: number;
  tentativas: number;
  /** Reserva vigente; null quando ninguém segura o agendamento. */
  reserva: string | null;
  ultimoErro: string | null;
  esperaSegundos: number | null;
}

class AgendamentosEmMemoria implements RepositorioDeAgendamentos {
  readonly itens = new Map<string, AgendamentoEmMemoria>();
  private reservas = 0;
  /** Executado logo após a reserva, para simular uma ação concorrente do titular. */
  aposReservar: () => void = () => undefined;

  adicionar(id: string, parcial: Partial<AgendamentoEmMemoria> = {}): void {
    this.itens.set(id, {
      id,
      titularId: 'titular-1',
      estado: 'PENDENTE',
      versao: 1,
      tentativas: 0,
      reserva: null,
      ultimoErro: null,
      esperaSegundos: null,
      ...parcial,
    });
  }

  async reservarDevidos(limite: number): Promise<AgendamentoReservado[]> {
    const elegiveis = [...this.itens.values()]
      .filter((item) => item.estado === 'PENDENTE' && item.reserva === null)
      .slice(0, limite);
    for (const item of elegiveis) {
      item.reserva = `reserva-${++this.reservas}`;
      item.tentativas += 1;
    }
    const reservados = elegiveis.map(({ id, titularId, versao, tentativas, reserva }) => ({
      id,
      titularId,
      versao,
      tentativas,
      reserva: reserva!,
    }));
    this.aposReservar();
    return reservados;
  }

  /** Mesmas condições das escritas do adaptador Prisma: versão, estado e reserva. */
  private vigente(reservado: AgendamentoReservado): AgendamentoEmMemoria | null {
    const item = this.itens.get(reservado.id);
    return item &&
      item.versao === reservado.versao &&
      item.estado === 'PENDENTE' &&
      item.reserva === reservado.reserva
      ? item
      : null;
  }

  async renovarReserva(reservado: AgendamentoReservado): Promise<boolean> {
    return this.vigente(reservado) !== null;
  }

  async concluir(reservado: AgendamentoReservado): Promise<boolean> {
    const item = this.vigente(reservado);
    if (!item) return false;
    item.estado = 'ENVIADO';
    item.reserva = null;
    return true;
  }

  async adiar(reservado: AgendamentoReservado, erro: string, esperaSegundos: number) {
    const item = this.vigente(reservado);
    if (!item) return;
    item.ultimoErro = erro;
    item.esperaSegundos = esperaSegundos;
    item.reserva = null;
  }

  async falhar(reservado: AgendamentoReservado, erro: string) {
    const item = this.vigente(reservado);
    if (!item) return;
    item.estado = 'FALHOU';
    item.ultimoErro = erro;
    item.reserva = null;
  }
}

class ProvedorEspiao implements ProvedorDeNotificacoes {
  readonly pedidos: PedidoDeEntrega[] = [];
  falha: Error | null = null;

  async enviar(pedido: PedidoDeEntrega): Promise<void> {
    if (this.falha) throw this.falha;
    this.pedidos.push(pedido);
  }
}

const registroMudo: Registro = { info: () => undefined, aviso: () => undefined, erro: () => undefined };

describe('Processador de lembretes: EntregarAvisosDevidos', () => {
  let agendamentos: AgendamentosEmMemoria;
  let provedor: ProvedorEspiao;
  let destinos: Record<string, string[]>;
  let processador: EntregarAvisosDevidos;

  beforeEach(() => {
    agendamentos = new AgendamentosEmMemoria();
    provedor = new ProvedorEspiao();
    destinos = { 'titular-1': ['token-do-celular'] };
    processador = new EntregarAvisosDevidos(
      agendamentos,
      { ativosDoTitular: async (titularId) => destinos[titularId] ?? [] },
      provedor,
      { lote: 10, reservaSegundos: 60, maxTentativas: 3, esperaBaseSegundos: 30 },
      registroMudo,
    );
  });

  it('entrega só token, chave agendamento+versão e mensagem genérica', async () => {
    agendamentos.adicionar('ag-1');

    await processador.executarCiclo();

    assert.deepEqual(provedor.pedidos, [
      { chave: 'ag-1:v1', destinos: ['token-do-celular'], mensagem: MENSAGEM_GENERICA },
    ]);
    assert.equal(agendamentos.itens.get('ag-1')?.estado, 'ENVIADO');
  });

  it('ignora a versão reservada se o titular reagendou antes do envio', async () => {
    agendamentos.adicionar('ag-1');
    agendamentos.aposReservar = () => {
      agendamentos.itens.get('ag-1')!.versao = 2; // reagendamento concorrente
    };

    await processador.executarCiclo();

    assert.equal(provedor.pedidos.length, 0);
    assert.equal(agendamentos.itens.get('ag-1')?.estado, 'PENDENTE');
  });

  it('ignora o agendamento cancelado depois da reserva', async () => {
    agendamentos.adicionar('ag-1');
    agendamentos.aposReservar = () => {
      agendamentos.itens.get('ag-1')!.estado = 'CANCELADO';
    };

    await processador.executarCiclo();

    assert.equal(provedor.pedidos.length, 0);
  });

  it('reserva vencida e assumida por outra réplica: esta não envia', async () => {
    agendamentos.adicionar('ag-1');
    agendamentos.aposReservar = () => {
      agendamentos.itens.get('ag-1')!.reserva = 'reserva-de-outra-replica';
    };

    await processador.executarCiclo();

    assert.equal(provedor.pedidos.length, 0);
    assert.equal(agendamentos.itens.get('ag-1')?.estado, 'PENDENTE');
  });

  it('falha transitória: mantém pendente e agenda nova tentativa com espera crescente', async () => {
    agendamentos.adicionar('ag-1', { tentativas: 1 }); // esta será a 2ª tentativa
    provedor.falha = new Error('timeout');

    await processador.executarCiclo();

    const item = agendamentos.itens.get('ag-1')!;
    assert.equal(item.estado, 'PENDENTE');
    assert.equal(item.ultimoErro, 'timeout');
    assert.equal(item.esperaSegundos, 60);
  });

  it('esgotadas as tentativas, o agendamento fica FALHOU com o motivo', async () => {
    agendamentos.adicionar('ag-1', { tentativas: 2 });
    provedor.falha = new Error('timeout');

    await processador.executarCiclo();

    assert.equal(agendamentos.itens.get('ag-1')?.estado, 'FALHOU');
  });

  it('recusa definitiva do provedor não é repetida', async () => {
    agendamentos.adicionar('ag-1');
    provedor.falha = new EntregaRecusadaErro('Provedor respondeu 400');

    await processador.executarCiclo();

    assert.equal(agendamentos.itens.get('ag-1')?.estado, 'FALHOU');
  });

  it('titular sem aparelho ativo (sessão revogada) não recebe aviso', async () => {
    agendamentos.adicionar('ag-1');
    destinos = {};

    await processador.executarCiclo();

    assert.equal(provedor.pedidos.length, 0);
    assert.equal(agendamentos.itens.get('ag-1')?.estado, 'FALHOU');
  });
});
