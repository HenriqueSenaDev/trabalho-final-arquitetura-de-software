/**
 * Processador de lembretes contra o PostgreSQL real (banco descartável).
 *   pnpm test:e2e   (com o docker compose de pé)
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';
import { PrismaClient } from '@personal-health/database';
import { prepararBancoDeTeste } from '@personal-health/database/dist/banco-de-teste';
import { PrismaAgendamentos } from '../../src/adaptadores/prisma-agendamentos';
import { PrismaDestinos } from '../../src/adaptadores/prisma-destinos';
import { EntregarAvisosDevidos, MENSAGEM_GENERICA } from '../../src/aplicacao/entregar-avisos-devidos';
import { PedidoDeEntrega, ProvedorDeNotificacoes } from '../../src/portas/provedor-de-notificacoes';
import { Registro } from '../../src/portas/registro';

class ProvedorEspiao implements ProvedorDeNotificacoes {
  readonly pedidos: PedidoDeEntrega[] = [];
  falha: Error | null = null;

  async enviar(pedido: PedidoDeEntrega): Promise<void> {
    if (this.falha) throw this.falha;
    this.pedidos.push(pedido);
  }
}

const registroMudo: Registro = { info: () => undefined, aviso: () => undefined, erro: () => undefined };
const configuracao = { lote: 20, reservaSegundos: 60, maxTentativas: 5, esperaBaseSegundos: 30 };

describe('Processador de lembretes com banco real', () => {
  let prisma: PrismaClient;
  let titularId: string;

  const processador = (provedor: ProvedorDeNotificacoes, lote = configuracao.lote) =>
    new EntregarAvisosDevidos(
      new PrismaAgendamentos(prisma),
      new PrismaDestinos(prisma),
      provedor,
      { ...configuracao, lote },
      registroMudo,
    );

  const agendar = async (dados: { instante: Date; estado?: 'PENDENTE' | 'CANCELADO' }) =>
    prisma.agendamento.create({
      data: {
        id: randomUUID(),
        titularId,
        origemTipo: 'CONSULTA',
        origemId: randomUUID(),
        instante: dados.instante,
        estado: dados.estado ?? 'PENDENTE',
      },
    });

  const haUmMinuto = () => new Date(Date.now() - 60_000);

  before(async () => {
    await prepararBancoDeTeste('personalhealth_e2e_processador');
    prisma = new PrismaClient();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.agendamento.deleteMany();
    await prisma.sessao.deleteMany();
    await prisma.titular.deleteMany();
    titularId = randomUUID();
    await prisma.titular.create({
      data: { id: titularId, nome: 'Ana', email: `${titularId}@teste.dev`, senhaHash: 'x' },
    });
    await prisma.sessao.createMany({
      data: [
        { id: randomUUID(), titularId, tokenHash: randomUUID(), dispositivo: 'novo', tokenEntrega: 'token-novo' },
        {
          id: randomUUID(),
          titularId,
          tokenHash: randomUUID(),
          dispositivo: 'perdido',
          tokenEntrega: 'token-perdido',
          revogadaEm: new Date(),
        },
      ],
    });
  });

  it('entrega o aviso vencido só ao aparelho com sessão ativa e marca ENVIADO', async () => {
    const agendamento = await agendar({ instante: haUmMinuto() });
    const provedor = new ProvedorEspiao();

    await processador(provedor).executarCiclo();

    assert.deepEqual(provedor.pedidos, [
      { chave: `${agendamento.id}:v1`, destinos: ['token-novo'], mensagem: MENSAGEM_GENERICA },
    ]);
    const salvo = await prisma.agendamento.findUniqueOrThrow({ where: { id: agendamento.id } });
    assert.equal(salvo.estado, 'ENVIADO');
    assert.equal(salvo.tentativas, 1);
  });

  it('não toca agendamento futuro nem cancelado', async () => {
    await agendar({ instante: new Date(Date.now() + 3_600_000) });
    await agendar({ instante: haUmMinuto(), estado: 'CANCELADO' });
    const provedor = new ProvedorEspiao();

    const reservados = await processador(provedor).executarCiclo();

    assert.equal(reservados, 0);
    assert.equal(provedor.pedidos.length, 0);
  });

  it('falha transitória deixa o agendamento pendente e fora da fila até a espera passar', async () => {
    const agendamento = await agendar({ instante: haUmMinuto() });
    const provedor = new ProvedorEspiao();
    provedor.falha = new Error('provedor fora do ar');

    await processador(provedor).executarCiclo();
    const segundoCiclo = await processador(provedor).executarCiclo();

    const salvo = await prisma.agendamento.findUniqueOrThrow({ where: { id: agendamento.id } });
    assert.equal(salvo.estado, 'PENDENTE');
    assert.equal(salvo.ultimoErro, 'provedor fora do ar');
    assert.ok(salvo.reservadoAte && salvo.reservadoAte.getTime() > Date.now());
    assert.equal(segundoCiclo, 0);
  });

  it('reserva vencida: outra réplica assume e a primeira desiste de enviar e de gravar', async () => {
    const agendamento = await agendar({ instante: haUmMinuto() });
    const repositorio = new PrismaAgendamentos(prisma);

    // Réplica A reserva por 1 s e "demora" no lote; o prazo vence e B assume.
    const [daReplicaA] = await repositorio.reservarDevidos(10, 1);
    await new Promise((resolver) => setTimeout(resolver, 1_500));
    const [daReplicaB] = await repositorio.reservarDevidos(10, 60);

    assert.equal(daReplicaB.id, agendamento.id);
    assert.notEqual(daReplicaB.reserva, daReplicaA.reserva);
    assert.equal(await repositorio.renovarReserva(daReplicaA, 60), false);
    assert.equal(await repositorio.concluir(daReplicaA), false);
    assert.equal(await repositorio.renovarReserva(daReplicaB, 60), true);
    assert.equal(await repositorio.concluir(daReplicaB), true);

    const salvo = await prisma.agendamento.findUniqueOrThrow({ where: { id: agendamento.id } });
    assert.equal(salvo.estado, 'ENVIADO');
    assert.equal(salvo.reserva, null);
  });

  it('três réplicas em paralelo entregam cada aviso uma única vez', async () => {
    const criados = await Promise.all(Array.from({ length: 12 }, () => agendar({ instante: haUmMinuto() })));
    const provedor = new ProvedorEspiao();
    const replica = async () => {
      const entregar = processador(provedor, 2);
      while ((await entregar.executarCiclo()) > 0);
    };

    await Promise.all([replica(), replica(), replica()]);

    const chaves = provedor.pedidos.map((pedido) => pedido.chave).sort();
    assert.deepEqual(chaves, criados.map((item) => `${item.id}:v1`).sort());
  });
});
