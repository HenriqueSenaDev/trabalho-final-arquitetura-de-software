/**
 * O fluxo principal de ponta a ponta, contra o PostgreSQL (banco descartável
 * criado no mesmo servidor do DATABASE_URL). Cada teste é um passo do fluxo
 * ou um cenário de qualidade da seção 5 do documento.
 *
 *   docker compose up -d && pnpm test:e2e
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@personal-health/database';
import { prepararBancoDeTeste } from '@personal-health/database/dist/banco-de-teste';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { gerarHashDeSenha } from '../../src/modulos/acesso-conta/adaptadores/saida/scrypt';

const ANA = { id: '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0001', email: 'ana@teste.dev', senha: 'senha-da-ana' };
const BRUNO = { id: '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0002', email: 'bruno@teste.dev', senha: 'senha-do-bruno' };

const daqui = (dias: number) => new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
/** Id gerado pelo aplicativo para tornar o registro idempotente. */
const CONSULTA_DO_APARELHO = '6f0c7a4e-1d2b-4c3a-8e9f-0a1b2c3d4e5f';

let prisma: PrismaClient;

describe('Fluxo principal: registrar consulta → linha do tempo → agendamento, reagendamento e cancelamento do aviso', () => {
  let app: INestApplication;
  let tokenDaAna: string;
  let sessaoDaAna: string;
  let tokenDoBruno: string;
  let consultaId: string;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    await prepararBancoDeTeste('personalhealth_e2e_api');
    prisma = new PrismaClient();
    for (const titular of [ANA, BRUNO]) {
      await prisma.titular.create({
        data: {
          id: titular.id,
          nome: titular.email,
          email: titular.email,
          senhaHash: await gerarHashDeSenha(titular.senha),
        },
      });
    }

    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('1. o titular entra pelo aplicativo e recebe um token de sessão', async () => {
    const resposta = await api()
      .post('/sessoes')
      .send({ email: ANA.email, senha: ANA.senha, dispositivo: 'android', tokenEntrega: 'token-da-ana' })
      .expect(201);

    expect(resposta.body.titular).toEqual({ id: ANA.id, nome: ANA.email });
    tokenDaAna = resposta.body.token;
    sessaoDaAna = resposta.body.sessaoId;

    const bruno = await api().post('/sessoes').send({ email: BRUNO.email, senha: BRUNO.senha });
    tokenDoBruno = bruno.body.token;
  });

  it('2. registra uma consulta futura com aviso; a API devolve o id após confirmar', async () => {
    const dataHora = daqui(3);
    const resposta = await api()
      .post('/consultas')
      .auth(tokenDaAna, { type: 'bearer' })
      .send({
        dataHora,
        especialidade: 'Cardiologia',
        local: 'Clínica Centro',
        retornoEm: daqui(33),
        lembrete: { antecedenciaMinutos: 24 * 60 },
      })
      .expect(201);

    consultaId = resposta.body.id;
    expect(new Date(resposta.body.avisoAgendadoPara)).toEqual(daquiMenosUmDia(dataHora));
  });

  it('3. o agendamento do aviso foi confirmado na mesma transação, versão 1, pendente', async () => {
    const agendamento = await prisma.agendamento.findUniqueOrThrow({
      where: { origemTipo_origemId: { origemTipo: 'CONSULTA', origemId: consultaId } },
    });
    expect(agendamento).toMatchObject({ titularId: ANA.id, estado: 'PENDENTE', versao: 1 });
  });

  it('4. Consistência: a próxima leitura da linha do tempo já mostra a consulta e o retorno em "Próximos"', async () => {
    // Nenhum processador de lembretes está rodando neste teste.
    const resposta = await api().get('/linha-do-tempo').auth(tokenDaAna, { type: 'bearer' }).expect(200);

    expect(resposta.body.proximos.map((item: { tipo: string; id: string }) => [item.tipo, item.id])).toEqual([
      ['CONSULTA', consultaId],
      ['RETORNO', consultaId],
    ]);
  });

  it('5. uma consulta passada aparece no mês do acontecimento', async () => {
    await api()
      .post('/consultas')
      .auth(tokenDaAna, { type: 'bearer' })
      .send({ dataHora: '2026-03-10T13:00:00.000Z', especialidade: 'Clínico geral' })
      .expect(201);

    const resposta = await api()
      .get('/linha-do-tempo?tipos=CONSULTA')
      .auth(tokenDaAna, { type: 'bearer' })
      .expect(200);
    expect(resposta.body.passados).toEqual([
      { mes: '2026-03', itens: [expect.objectContaining({ titulo: 'Clínico geral' })] },
    ]);
  });

  it('6. um retorno anterior à consulta é recusado e nada é gravado', async () => {
    const antes = await prisma.consulta.count();
    const resposta = await api()
      .post('/consultas')
      .auth(tokenDaAna, { type: 'bearer' })
      .send({ dataHora: daqui(10), retornoEm: daqui(5), especialidade: 'Dermatologia' })
      .expect(422);

    expect(resposta.body.message).toBe('O retorno precisa ser posterior à consulta.');
    expect(await prisma.consulta.count()).toBe(antes);
  });

  it('7. Privacidade: outro titular recebe a resposta de recurso inexistente, e a tentativa fica rastreável', async () => {
    const alheia = await api().get(`/consultas/${consultaId}`).auth(tokenDoBruno, { type: 'bearer' });
    const inexistente = await api()
      .get('/consultas/00000000-0000-4000-8000-000000000000')
      .auth(tokenDoBruno, { type: 'bearer' });

    expect(alheia.status).toBe(404);
    expect(alheia.body).toEqual(inexistente.body);

    const registro = await prisma.registroAuditoria.findFirstOrThrow({
      where: { identidade: BRUNO.id, referencia: consultaId },
    });
    expect(registro).toMatchObject({ acao: 'consulta.detalhar', resultado: 'NEGADO' });
    expect(JSON.stringify(registro)).not.toContain('Cardiologia');
  });

  it('8. o titular vem da sessão: o cliente não consegue indicar outro titular', async () => {
    await api()
      .post('/consultas')
      .auth(tokenDoBruno, { type: 'bearer' })
      .send({ titularId: ANA.id, dataHora: daqui(2), especialidade: 'Cardiologia' })
      .expect(400);
  });

  it('9. sem sessão válida não há acesso, e a tentativa fica na trilha sem identificadores', async () => {
    await api().get('/linha-do-tempo').expect(401);
    await api().get('/linha-do-tempo').auth('token-inventado', { type: 'bearer' }).expect(401);

    const negadas = await prisma.registroAuditoria.count({
      where: { acao: 'sessao.validar', resultado: 'NEGADO', referencia: 'GET /linha-do-tempo' },
    });
    expect(negadas).toBe(2);
  });

  it('10. repetir o registro com o mesmo id (resposta perdida) não duplica consulta nem aviso', async () => {
    const pedido = {
      id: CONSULTA_DO_APARELHO,
      dataHora: daqui(5),
      especialidade: 'Ortopedia',
      lembrete: { antecedenciaMinutos: 60 },
    };

    const primeira = await api().post('/consultas').auth(tokenDaAna, { type: 'bearer' }).send(pedido).expect(201);
    const repetida = await api().post('/consultas').auth(tokenDaAna, { type: 'bearer' }).send(pedido).expect(201);

    expect(repetida.body).toEqual(primeira.body);
    expect(primeira.body.id).toBe(CONSULTA_DO_APARELHO);
    expect(await prisma.consulta.count({ where: { id: CONSULTA_DO_APARELHO } })).toBe(1);
    expect(await prisma.agendamento.count({ where: { origemId: CONSULTA_DO_APARELHO } })).toBe(1);
  });

  it('11. remarcar a consulta reagenda o aviso com a mesma antecedência, em nova versão', async () => {
    const novaData = daqui(4);
    const resposta = await api()
      .patch(`/consultas/${consultaId}`)
      .auth(tokenDaAna, { type: 'bearer' })
      .send({ dataHora: novaData })
      .expect(200);

    expect(new Date(resposta.body.avisoAgendadoPara)).toEqual(daquiMenosUmDia(novaData));
    expect(await agendamentoDa(consultaId)).toMatchObject({ estado: 'PENDENTE', versao: 2 });

    const linha = await api().get('/linha-do-tempo?tipos=CONSULTA').auth(tokenDaAna, { type: 'bearer' });
    const item = linha.body.proximos.find((i: { id: string }) => i.id === consultaId);
    expect(new Date(item.data)).toEqual(novaData);
  });

  it('12. cancelar o aviso gera nova versão CANCELADO, visível no detalhe', async () => {
    await api()
      .patch(`/consultas/${consultaId}`)
      .auth(tokenDaAna, { type: 'bearer' })
      .send({ lembrete: null })
      .expect(200, { id: consultaId, avisoAgendadoPara: null });

    const detalhe = await api().get(`/consultas/${consultaId}`).auth(tokenDaAna, { type: 'bearer' }).expect(200);
    expect(detalhe.body.aviso).toMatchObject({ estado: 'CANCELADO', versao: 3 });
  });

  it('13. Privacidade: outro titular não altera nem exclui, recebe a resposta de recurso inexistente', async () => {
    const inexistente = await api()
      .patch('/consultas/00000000-0000-4000-8000-000000000000')
      .auth(tokenDoBruno, { type: 'bearer' })
      .send({ especialidade: 'Invasão' });
    const alteracao = await api()
      .patch(`/consultas/${CONSULTA_DO_APARELHO}`)
      .auth(tokenDoBruno, { type: 'bearer' })
      .send({ especialidade: 'Invasão' });
    const exclusao = await api()
      .delete(`/consultas/${CONSULTA_DO_APARELHO}`)
      .auth(tokenDoBruno, { type: 'bearer' });

    expect([alteracao.status, exclusao.status]).toEqual([404, 404]);
    expect(alteracao.body).toEqual(inexistente.body);
    expect(exclusao.body).toEqual(inexistente.body);
    const intacta = await prisma.consulta.findUniqueOrThrow({ where: { id: CONSULTA_DO_APARELHO } });
    expect(intacta.especialidade).toBe('Ortopedia');
    expect(
      await prisma.registroAuditoria.count({
        where: { identidade: BRUNO.id, referencia: CONSULTA_DO_APARELHO, resultado: 'NEGADO' },
      }),
    ).toBe(2);
  });

  it('14. excluir remove consulta e retorno da linha do tempo e cancela o aviso pendente', async () => {
    await api().delete(`/consultas/${CONSULTA_DO_APARELHO}`).auth(tokenDaAna, { type: 'bearer' }).expect(204);

    await api().get(`/consultas/${CONSULTA_DO_APARELHO}`).auth(tokenDaAna, { type: 'bearer' }).expect(404);
    const linha = await api().get('/linha-do-tempo').auth(tokenDaAna, { type: 'bearer' });
    const ids = linha.body.proximos.map((item: { id: string }) => item.id);
    expect(ids).not.toContain(CONSULTA_DO_APARELHO);
    expect(await agendamentoDa(CONSULTA_DO_APARELHO)).toMatchObject({ estado: 'CANCELADO', versao: 2 });
  });

  it('15. erros de formato vêm em português, um por campo', async () => {
    const resposta = await api()
      .post('/consultas')
      .auth(tokenDaAna, { type: 'bearer' })
      .send({ dataHora: 'amanhã', especialidade: '', lembrete: { antecedenciaMinutos: 1 } })
      .expect(400);

    expect(resposta.body.message).toEqual(
      expect.arrayContaining([
        'dataHora: precisa ser uma data e hora válida.',
        'especialidade: não pode ficar vazio.',
        'lembrete.antecedenciaMinutos: está abaixo do mínimo permitido.',
      ]),
    );
  });

  it('16. revogar a sessão: o token deixa de valer e o aparelho sai dos destinos de notificação', async () => {
    const sessoes = await api().get('/sessoes').auth(tokenDaAna, { type: 'bearer' }).expect(200);
    expect(sessoes.body).toEqual([expect.objectContaining({ id: sessaoDaAna, dispositivo: 'android', atual: true })]);

    // Bruno não revoga a sessão da Ana.
    await api().delete(`/sessoes/${sessaoDaAna}`).auth(tokenDoBruno, { type: 'bearer' }).expect(404);
    await api().get('/linha-do-tempo').auth(tokenDaAna, { type: 'bearer' }).expect(200);

    await api().delete(`/sessoes/${sessaoDaAna}`).auth(tokenDaAna, { type: 'bearer' }).expect(204);

    await api().get('/linha-do-tempo').auth(tokenDaAna, { type: 'bearer' }).expect(401);
    const destinos = await prisma.$queryRaw<{ token_entrega: string }[]>`
      SELECT token_entrega FROM destinos_notificacao WHERE titular_id = ${ANA.id}::uuid
    `;
    expect(destinos).toEqual([]);
  });
});

function agendamentoDa(consultaId: string) {
  return prisma.agendamento.findUniqueOrThrow({
    where: { origemTipo_origemId: { origemTipo: 'CONSULTA', origemId: consultaId } },
  });
}

function daquiMenosUmDia(data: Date): Date {
  return new Date(new Date(data).getTime() - 24 * 60 * 60 * 1000);
}
