/**
 * O fluxo principal inteiro, atravessando os contêineres: a API grava a
 * consulta e o agendamento, e o caso de uso real do Processador de lembretes
 * (apps/worker) lê o mesmo banco e entrega ao provedor. O provedor é um
 * espião no lugar do adaptador console/http.
 *
 *   docker compose up -d && pnpm test:e2e
 */
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@personal-health/database';
import { prepararBancoDeTeste } from '@personal-health/database/dist/banco-de-teste';
import request from 'supertest';
import { PrismaAgendamentos } from '../../../worker/src/adaptadores/prisma-agendamentos';
import { PrismaDestinos } from '../../../worker/src/adaptadores/prisma-destinos';
import {
  EntregarAvisosDevidos,
  MENSAGEM_GENERICA,
} from '../../../worker/src/aplicacao/entregar-avisos-devidos';
import { AgendamentoReservado } from '../../../worker/src/portas/agendamentos';
import {
  PedidoDeEntrega,
  ProvedorDeNotificacoes,
} from '../../../worker/src/portas/provedor-de-notificacoes';
import { Registro } from '../../../worker/src/portas/registro';
import { AppModule } from '../../src/app.module';
import { ContextoPrisma } from '../../src/compartilhado/adaptadores/contexto-prisma';
import { PrismaRepositorioAgendamentos } from '../../src/modulos/lembretes/adaptadores/saida/prisma-repositorio-agendamentos';
import { Agendamento } from '../../src/modulos/lembretes/dominio/agendamento';
import { PublicadorEventos } from '../../src/modulos/lembretes/portas/eventos';
import { gerarHashDeSenha } from '../../src/modulos/acesso-conta/adaptadores/saida/scrypt';

const ANA = {
  id: '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0001',
  email: 'ana@teste.dev',
  senha: 'senha-da-ana',
};
const UM_DIA = 24 * 60;
const daqui = (dias: number) => new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

class ProvedorEspiao implements ProvedorDeNotificacoes {
  pedidos: PedidoDeEntrega[] = [];

  async enviar(pedido: PedidoDeEntrega): Promise<void> {
    this.pedidos.push(pedido);
  }
}

/** Deixa o teste agir no intervalo entre a reserva e o envio, como um titular concorrente. */
class AgendamentosComIntervalo extends PrismaAgendamentos {
  aposReservar: () => Promise<void> = async () => undefined;

  async reservarDevidos(limite: number, reservaSegundos: number): Promise<AgendamentoReservado[]> {
    const reservados = await super.reservarDevidos(limite, reservaSegundos);
    await this.aposReservar();
    return reservados;
  }
}

const registroMudo: Registro = {
  info: () => undefined,
  aviso: () => undefined,
  erro: () => undefined,
};

describe('Fluxo completo: aplicativo → API → banco → processador → provedor', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let provedor: ProvedorEspiao;
  let agendamentos: AgendamentosComIntervalo;
  let processador: EntregarAvisosDevidos;
  let tokenDaAna: string;
  let sessaoDoCelularAntigo: string;

  const api = () => request(app.getHttpServer());

  /** O tempo passa: o aviso da consulta vence agora. */
  const vencerAvisoDa = (consultaId: string) => prisma.$executeRaw`
    UPDATE agendamentos SET instante = timezone('utc', now()) - interval '1 second'
     WHERE origem_id = ${consultaId}::uuid
  `;

  const registrarComAviso = async (dias: number) => {
    const resposta = await api()
      .post('/consultas')
      .auth(tokenDaAna, { type: 'bearer' })
      .send({
        dataHora: daqui(dias),
        especialidade: 'Cardiologia',
        lembrete: { antecedenciaMinutos: UM_DIA },
      })
      .expect(201);
    return resposta.body.id as string;
  };

  const agendamentoDa = (consultaId: string) =>
    prisma.agendamento.findUniqueOrThrow({
      where: { origemTipo_origemId: { origemTipo: 'CONSULTA', origemId: consultaId } },
    });

  beforeAll(async () => {
    await prepararBancoDeTeste('personalhealth_e2e_fluxo_completo');
    prisma = new PrismaClient();
    await prisma.titular.create({
      data: {
        id: ANA.id,
        nome: 'Ana',
        email: ANA.email,
        senhaHash: await gerarHashDeSenha(ANA.senha),
      },
    });

    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    await app.init();

    provedor = new ProvedorEspiao();
    agendamentos = new AgendamentosComIntervalo(prisma);
    processador = new EntregarAvisosDevidos(
      agendamentos,
      new PrismaDestinos(prisma),
      provedor,
      { lote: 20, reservaSegundos: 60, maxTentativas: 5, esperaBaseSegundos: 30 },
      registroMudo,
    );
  });

  beforeEach(() => {
    provedor.pedidos = [];
    agendamentos.aposReservar = async () => undefined;
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('reverte agendamento e evento juntos quando a transação falha', async () => {
    const consultaId = randomUUID();
    const agendamento = Agendamento.paraConsulta(
      { titularId: ANA.id, consultaId, instante: daqui(3) },
      new Date(),
    );
    const id = agendamento.paraGravacao().id;
    const contexto = app.get(ContextoPrisma);
    const repositorio = new PrismaRepositorioAgendamentos(contexto, app.get(PublicadorEventos));
    await expect(
      contexto.emTransacao(async () => {
        await repositorio.salvar(agendamento);
        throw new Error('falha simulada');
      }),
    ).rejects.toThrow('falha simulada');
    expect(await prisma.agendamento.findUnique({ where: { id } })).toBeNull();
    const eventos = await prisma.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM eventos_outbox WHERE origem_id = ${id}::uuid`;
    expect(eventos).toHaveLength(0);
  });

  it('o titular registra a consulta pelo app e o aviso chega ao aparelho dele, uma vez', async () => {
    const sessao = await api()
      .post('/sessoes')
      .send({
        email: ANA.email,
        senha: ANA.senha,
        dispositivo: 'android',
        tokenEntrega: 'celular-antigo',
      })
      .expect(201);
    tokenDaAna = sessao.body.token;
    sessaoDoCelularAntigo = sessao.body.sessaoId;

    const consultaId = await registrarComAviso(3);
    await vencerAvisoDa(consultaId);

    await processador.executarCiclo();
    await processador.executarCiclo(); // um segundo ciclo não reenvia

    const { id: agendamentoId } = await agendamentoDa(consultaId);
    const eventos = await prisma.$queryRaw<Array<{ tipo: string; versao: number }>>`
      SELECT tipo, versao FROM eventos_outbox WHERE origem_id = ${agendamentoId}::uuid`;
    expect(eventos).toEqual([{ tipo: 'ReminderChanged', versao: 1 }]);
    expect(provedor.pedidos).toEqual([
      { chave: `${agendamentoId}:v1`, destinos: ['celular-antigo'], mensagem: MENSAGEM_GENERICA },
    ]);
    expect(await agendamentoDa(consultaId)).toMatchObject({
      estado: 'ENVIADO',
      versao: 1,
      reserva: null,
    });
  });

  it('critério de aceite: ao reagendar, só a nova versão do aviso pode ser entregue', async () => {
    const consultaId = await registrarComAviso(3);
    await vencerAvisoDa(consultaId);

    // O processador reserva a versão 1; antes do envio, o titular remarca a consulta.
    agendamentos.aposReservar = async () => {
      await api()
        .patch(`/consultas/${consultaId}`)
        .auth(tokenDaAna, { type: 'bearer' })
        .send({ dataHora: daqui(6) })
        .expect(200);
    };
    await processador.executarCiclo();
    expect(provedor.pedidos).toEqual([]);
    expect(await agendamentoDa(consultaId)).toMatchObject({
      estado: 'PENDENTE',
      versao: 2,
      reserva: null,
    });

    agendamentos.aposReservar = async () => undefined;
    await vencerAvisoDa(consultaId);
    await processador.executarCiclo();

    const { id: agendamentoId } = await agendamentoDa(consultaId);
    expect(provedor.pedidos.map((pedido) => pedido.chave)).toEqual([`${agendamentoId}:v2`]);
  });

  it('aviso cancelado pelo titular não é entregue', async () => {
    const consultaId = await registrarComAviso(3);
    await api()
      .patch(`/consultas/${consultaId}`)
      .auth(tokenDaAna, { type: 'bearer' })
      .send({ lembrete: null })
      .expect(200);
    await vencerAvisoDa(consultaId);

    expect(await processador.executarCiclo()).toBe(0);
    expect(provedor.pedidos).toEqual([]);
  });

  it('Recuperação: o celular antigo revogado deixa de receber, o novo recebe', async () => {
    const novo = await api()
      .post('/sessoes')
      .send({
        email: ANA.email,
        senha: ANA.senha,
        dispositivo: 'ios',
        tokenEntrega: 'celular-novo',
      })
      .expect(201);
    tokenDaAna = novo.body.token;

    await api()
      .delete(`/sessoes/${sessaoDoCelularAntigo}`)
      .auth(tokenDaAna, { type: 'bearer' })
      .expect(204);

    const consultaId = await registrarComAviso(3);
    await vencerAvisoDa(consultaId);
    await processador.executarCiclo();

    expect(provedor.pedidos.map((pedido) => pedido.destinos)).toEqual([['celular-novo']]);
  });
});
