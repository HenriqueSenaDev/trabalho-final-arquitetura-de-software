/**
 * Fluxo principal de ponta a ponta: aplicativo → API de Saúde → banco →
 * outbox → processador → provedor de notificações. A API sobe inteira
 * (AppModule) e o processador roda com as classes reais de apps/worker; o
 * provedor é um espião no lugar do console/http.
 *
 *   docker compose up -d && pnpm test:e2e
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@personal-health/database';
import request from 'supertest';
import { WorkerConfig } from '../../../worker/src/config';
import {
  GENERIC_MESSAGE,
  NotificationDispatcher,
} from '../../../worker/src/notifications/notification-dispatcher';
import { Notice, NotificationProvider } from '../../../worker/src/notifications/notification-provider';
import { OutboxRelay } from '../../../worker/src/outbox/outbox-relay';
import { AppModule } from '../../src/app.module';
import { prepareTestDatabase } from './test-database';

class SpyProvider implements NotificationProvider {
  sent: Notice[] = [];
  async send(notice: Notice): Promise<void> {
    this.sent.push(notice);
  }
}

const ONE_DAY = 24 * 60;
const inDays = (days: number) => new Date(Date.now() + days * ONE_DAY * 60_000);
const ANA = { fullName: 'Ana Souza', email: 'ana@teste.dev', password: 'senha-da-ana' };
const BRUNO = { fullName: 'Bruno Lima', email: 'bruno@teste.dev', password: 'senha-do-bruno' };
const CLIENT_ID = '6f0c7a4e-1d2b-4c3a-8e9f-0a1b2c3d4e5f';
const NONEXISTENT = '00000000-0000-4000-8000-000000000000';

describe('Fluxo principal: registrar consulta → linha do tempo → aviso no aparelho', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let provider: SpyProvider;
  let relay: OutboxRelay;
  let dispatcher: NotificationDispatcher;
  let ana: { id: string; token: string; sessionId: string };
  let bruno: { id: string; token: string };
  let consultationId: string;

  const api = () => request(app.getHttpServer());
  const asAna = (method: 'get' | 'post' | 'patch' | 'delete', path: string) =>
    api()[method](path).auth(ana.token, { type: 'bearer' });
  const asBruno = (method: 'get' | 'post' | 'patch' | 'delete', path: string) =>
    api()[method](path).auth(bruno.token, { type: 'bearer' });

  /** Uma volta do processador: eventos do outbox, depois avisos vencidos. */
  const workerCycle = async () => {
    await relay.processBatch();
    await dispatcher.processDue();
  };
  /** O tempo passa: os avisos do lembrete vencem agora. */
  const makeDue = (reminderId: string) => prisma.$executeRaw`
    UPDATE notification_deliveries SET scheduled_for = timezone('utc', now()) - interval '1 second'
     WHERE reminder_id = ${reminderId}::uuid AND status = 'RESERVED'
  `;
  const reminderOf = (recordId: string) => prisma.reminder.findUniqueOrThrow({ where: { recordId } });

  beforeAll(async () => {
    await prepareTestDatabase('personalhealth_e2e_main_flow');
    // O adapter S3 só monta o cliente; nenhum teste aqui envia arquivos.
    process.env.STORAGE_BUCKET ??= 'personalhealth-attachments';
    process.env.STORAGE_ACCESS_KEY ??= 'minioadmin';
    process.env.STORAGE_SECRET_KEY ??= 'minioadmin';

    prisma = new PrismaClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const config: WorkerConfig = {
      pollIntervalMs: 1000,
      batchSize: 50,
      maxAttempts: 5,
      notificationProvider: 'console',
      notificationProviderUrl: '',
      notificationProviderToken: '',
    };
    provider = new SpyProvider();
    relay = new OutboxRelay(prisma, config);
    dispatcher = new NotificationDispatcher(prisma, provider, config);
  });

  beforeEach(() => {
    provider.sent = [];
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('1. cadastro e login abrem uma sessão por aparelho; o servidor guarda só o hash', async () => {
    const created = await api().post('/holders').send(ANA).expect(201);
    await api().post('/holders').send(BRUNO).expect(201);

    const session = await api()
      .post('/sessions')
      .send({ email: ANA.email, password: ANA.password, device: 'android', deliveryToken: 'celular-da-ana' })
      .expect(201);
    ana = { id: created.body.id, token: session.body.token, sessionId: session.body.sessionId };
    expect(session.body.holder).toMatchObject({ id: ana.id, email: ANA.email });
    expect(session.body.holder.passwordHash).toBeUndefined();

    const brunoSession = await api()
      .post('/sessions')
      .send({ email: BRUNO.email, password: BRUNO.password })
      .expect(201);
    bruno = { id: brunoSession.body.holder.id, token: brunoSession.body.token };

    const stored = await prisma.session.findUniqueOrThrow({ where: { id: ana.sessionId } });
    expect(stored.tokenHash).not.toBe(ana.token);
    await api().post('/sessions').send({ email: ANA.email, password: 'senha-errada' }).expect(401);
  });

  it('2. sem sessão válida não há acesso, e a tentativa fica na trilha sem identificadores', async () => {
    await api().get(`/holders/${ana.id}/timeline`).expect(401);
    await api().get(`/holders/${ana.id}/timeline`).auth('token-inventado', { type: 'bearer' }).expect(401);

    const denied = await prisma.auditLog.count({
      where: { action: 'session.validate', outcome: 'DENIED', reference: 'GET /holders/:holderId/timeline' },
    });
    expect(denied).toBe(2);
  });

  it('3. consulta futura com retorno e aviso: consulta, lembrete e eventos na mesma transação', async () => {
    const occurredAt = inDays(7);
    const response = await asAna('post', `/holders/${ana.id}/records`)
      .send({
        kind: 'CONSULTATION',
        title: 'Cardiologia',
        occurredAt,
        professional: 'Dra. Helena',
        location: 'Clínica Centro',
        followUpAt: inDays(37),
        reminder: { minutesBefore: ONE_DAY },
      })
      .expect(201);

    consultationId = response.body.id;
    expect(response.body.reminder).toMatchObject({ status: 'SCHEDULED', version: 1 });
    expect(new Date(response.body.reminder.remindAt)).toEqual(new Date(occurredAt.getTime() - ONE_DAY * 60_000));

    const events = await prisma.outboxEvent.findMany({ orderBy: { occurredAt: 'asc' } });
    expect(events.map((event) => event.type)).toEqual(['health-record.created', 'reminder.scheduled']);
  });

  it('4. Consistência: a consulta e o retorno aparecem em Próximos na próxima leitura', async () => {
    const timeline = await asAna('get', `/holders/${ana.id}/timeline`).expect(200);

    expect(timeline.body.upcoming.map((item: { type: string; id: string }) => [item.type, item.id])).toEqual([
      ['CONSULTATION', consultationId],
      ['FOLLOW_UP', consultationId],
    ]);
  });

  it('5. consulta passada entra no mês do acontecimento; com aviso, é recusada sem gravar', async () => {
    await asAna('post', `/holders/${ana.id}/records`)
      .send({ kind: 'CONSULTATION', title: 'Clínico geral', occurredAt: '2026-03-10T13:00:00Z' })
      .expect(201);
    await asAna('post', `/holders/${ana.id}/records`)
      .send({
        kind: 'CONSULTATION',
        title: 'Dermatologia',
        occurredAt: '2026-02-10T13:00:00Z',
        reminder: { minutesBefore: 60 },
      })
      .expect(422, { statusCode: 422, message: 'Só é possível pedir aviso para uma consulta futura.' });

    const timeline = await asAna('get', `/holders/${ana.id}/timeline?types=CONSULTATION`).expect(200);
    const march = timeline.body.past.find((month: { month: string }) => month.month === '2026-03');
    expect(march.items.map((item: { title: string }) => item.title)).toEqual(['Clínico geral']);
    expect(await prisma.healthRecord.count({ where: { title: 'Dermatologia' } })).toBe(0);
  });

  it('6. retorno anterior à consulta é recusado', async () => {
    await asAna('post', `/holders/${ana.id}/records`)
      .send({ kind: 'CONSULTATION', title: 'Ortopedia', occurredAt: inDays(5), followUpAt: inDays(4) })
      .expect(422, { statusCode: 422, message: 'O retorno precisa ser posterior à consulta.' });
  });

  it('7. Privacidade: outro titular recebe a resposta de recurso inexistente, e nada muda', async () => {
    const nonexistent = await asBruno('get', `/holders/${bruno.id}/records/${NONEXISTENT}`).expect(404);
    const someoneElses = await asBruno('get', `/holders/${bruno.id}/records/${consultationId}`).expect(404);
    expect(someoneElses.body).toEqual(nonexistent.body);

    await asBruno('get', `/holders/${ana.id}/records/${consultationId}`).expect(404);
    await asBruno('patch', `/holders/${bruno.id}/records/${consultationId}`).send({ title: 'Invasão' }).expect(404);
    await asBruno('delete', `/holders/${bruno.id}/records/${consultationId}`).expect(404);
    await asBruno('get', `/holders/${ana.id}/timeline`).expect(404);

    expect((await prisma.healthRecord.findUniqueOrThrow({ where: { id: consultationId } })).title).toBe('Cardiologia');
    expect(
      await prisma.auditLog.count({ where: { holderId: bruno.id, outcome: 'DENIED' } }),
    ).toBeGreaterThanOrEqual(5);
  });

  it('8. repetir o envio com o mesmo id (resposta perdida) não duplica consulta nem aviso', async () => {
    const body = {
      id: CLIENT_ID,
      kind: 'CONSULTATION',
      title: 'Oftalmologia',
      occurredAt: inDays(10),
      reminder: { minutesBefore: 60 },
    };
    const first = await asAna('post', `/holders/${ana.id}/records`).send(body).expect(201);
    const repeated = await asAna('post', `/holders/${ana.id}/records`).send(body).expect(201);

    expect(repeated.body).toEqual(first.body);
    expect(await prisma.healthRecord.count({ where: { id: CLIENT_ID } })).toBe(1);
    expect(await prisma.reminder.count({ where: { recordId: CLIENT_ID } })).toBe(1);
  });

  it('9. o processador entrega o aviso ao aparelho da Ana, uma vez, sem conteúdo clínico', async () => {
    await workerCycle(); // reserva os avisos a partir do outbox
    const reminder = await reminderOf(consultationId);
    await makeDue(reminder.id);

    await workerCycle();
    await workerCycle(); // um segundo ciclo não reenvia

    expect(provider.sent).toEqual([
      {
        deliveryId: expect.any(String),
        idempotencyKey: `${reminder.id}:v1`,
        destinations: ['celular-da-ana'],
        message: GENERIC_MESSAGE,
      },
    ]);
    expect(await reminderOf(consultationId)).toMatchObject({ status: 'DONE', version: 1 });
  });

  it('10. critério de aceite: ao reagendar, só a nova versão do aviso pode ser entregue', async () => {
    const { reminder: original } = (
      await asAna('get', `/holders/${ana.id}/records/${CLIENT_ID}`).expect(200)
    ).body;
    expect(original).toMatchObject({ status: 'SCHEDULED', version: 1 });
    const reminderId = (await reminderOf(CLIENT_ID)).id;
    await makeDue(reminderId); // o aviso da versão 1 vence...

    // ...e o titular remarca antes de o processador ver o evento de reagendamento.
    const moved = await asAna('patch', `/holders/${ana.id}/records/${CLIENT_ID}`)
      .send({ occurredAt: inDays(12) })
      .expect(200);
    expect(moved.body.reminder).toMatchObject({ status: 'SCHEDULED', version: 2 });

    await dispatcher.processDue();
    expect(provider.sent).toEqual([]); // a versão 1 é revalidada e não sai

    await workerCycle(); // o evento de reagendamento reserva a versão 2
    await makeDue(reminderId);
    await workerCycle();

    expect(provider.sent.map((notice) => notice.idempotencyKey)).toEqual([`${reminderId}:v2`]);
    const deliveries = await prisma.notificationDelivery.findMany({
      where: { reminderId },
      orderBy: { version: 'asc' },
    });
    expect(deliveries.map((d) => [d.version, d.status])).toEqual([
      [1, 'CANCELLED'],
      [2, 'SENT'],
    ]);
  });

  it('11. aviso cancelado pelo titular não é entregue', async () => {
    const created = await asAna('post', `/holders/${ana.id}/records`)
      .send({ kind: 'CONSULTATION', title: 'Neurologia', occurredAt: inDays(3), reminder: { minutesBefore: 60 } })
      .expect(201);
    await workerCycle();

    const cancelled = await asAna('patch', `/holders/${ana.id}/records/${created.body.id}`)
      .send({ reminder: null })
      .expect(200);
    expect(cancelled.body.reminder).toMatchObject({ status: 'CANCELLED', version: 2 });

    const reminderId = (await reminderOf(created.body.id)).id;
    await makeDue(reminderId);
    await workerCycle();
    await workerCycle();
    expect(provider.sent).toEqual([]);
  });

  it('12. excluir tira a consulta e o retorno da linha do tempo e cancela o aviso pendente', async () => {
    const created = await asAna('post', `/holders/${ana.id}/records`)
      .send({
        kind: 'CONSULTATION',
        title: 'Endocrinologia',
        occurredAt: inDays(4),
        followUpAt: inDays(30),
        reminder: { minutesBefore: 60 },
      })
      .expect(201);

    await asAna('delete', `/holders/${ana.id}/records/${created.body.id}`).expect(204);

    await asAna('get', `/holders/${ana.id}/records/${created.body.id}`).expect(404);
    const timeline = await asAna('get', `/holders/${ana.id}/timeline`).expect(200);
    expect(timeline.body.upcoming.map((item: { id: string }) => item.id)).not.toContain(created.body.id);
    expect(await reminderOf(created.body.id)).toMatchObject({ status: 'CANCELLED', version: 2 });
  });

  it('13. erros de formato vêm em português, um por campo', async () => {
    const response = await asAna('post', `/holders/${ana.id}/records`)
      .send({ kind: 'CONSULTA', title: '', occurredAt: 'amanhã', reminder: { minutesBefore: 1 } })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'kind: tem um valor que não é aceito.',
        'title: não pode ficar vazio.',
        'occurredAt: precisa ser uma data e hora válida.',
        'reminder.minutesBefore: está abaixo do mínimo permitido.',
      ]),
    );
  });

  it('14. os módulos existentes continuam funcionando atrás da sessão', async () => {
    await asAna('post', `/holders/${ana.id}/indicators`)
      .send({ type: 'pressao-sistolica', value: 120, unit: 'mmHg', measuredAt: new Date() })
      .expect(201);
    await asAna('post', `/holders/${ana.id}/reminders`)
      .send({ title: 'Tomar vitamina D', remindAt: inDays(1) })
      .expect(201);
    await asAna('get', `/holders/${ana.id}`).expect(200);
    await asBruno('get', `/holders/${ana.id}/indicators`).expect(404);
  });

  it('15. Recuperação: o aparelho antigo revogado deixa de autorizar e de receber avisos', async () => {
    const newDevice = await api()
      .post('/sessions')
      .send({ email: ANA.email, password: ANA.password, device: 'ios', deliveryToken: 'celular-novo' })
      .expect(201);
    const oldToken = ana.token;
    ana.token = newDevice.body.token;

    const sessions = await asAna('get', '/sessions').expect(200);
    expect(sessions.body).toHaveLength(2);
    expect(sessions.body.find((s: { current: boolean }) => s.current).id).toBe(newDevice.body.sessionId);

    await asBruno('delete', `/sessions/${ana.sessionId}`).expect(404);
    await asAna('delete', `/sessions/${ana.sessionId}`).expect(204);
    await api().get(`/holders/${ana.id}/timeline`).auth(oldToken, { type: 'bearer' }).expect(401);

    const created = await asAna('post', `/holders/${ana.id}/records`)
      .send({ kind: 'CONSULTATION', title: 'Pneumologia', occurredAt: inDays(2), reminder: { minutesBefore: 60 } })
      .expect(201);
    await workerCycle();
    await makeDue((await reminderOf(created.body.id)).id);
    await workerCycle();

    expect(provider.sent.map((notice) => notice.destinations)).toEqual([['celular-novo']]);
  });
});
