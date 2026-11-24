/**
 * Consulta e aviso na mesma transação, com os casos de uso reais de
 * health-records e reminders sobre repositórios em memória.
 */
import { EVENT_TYPES } from '@personal-health/contracts';
import { ConflictError, DomainError, NotFoundError } from '../src/core/domain/errors';
import { CreateHealthRecordUseCase } from '../src/modules/health-records/application/create-health-record.use-case';
import { DeleteHealthRecordUseCase } from '../src/modules/health-records/application/delete-health-record.use-case';
import { UpdateHealthRecordUseCase } from '../src/modules/health-records/application/update-health-record.use-case';
import {
  consultationReminders,
  InMemoryAttachmentStorage,
  InMemoryHealthRecordRepository,
  InMemoryReminderRepository,
  InMemoryUnitOfWork,
} from './in-memory';

const holderId = '7f1d2c4e-0000-4000-8000-000000000001';
const otherHolder = '7f1d2c4e-0000-4000-8000-000000000002';
const clientId = '6f0c7a4e-1d2b-4c3a-8e9f-0a1b2c3d4e5f';
const ONE_DAY = 24 * 60;
const inDays = (days: number) => {
  const date = new Date(Date.now() + days * ONE_DAY * 60_000);
  date.setUTCSeconds(0, 0);
  return date;
};

describe('Fluxo da consulta: registrar, remarcar, cancelar aviso e excluir', () => {
  let records: InMemoryHealthRecordRepository;
  let reminders: InMemoryReminderRepository;
  let storage: InMemoryAttachmentStorage;
  let create: CreateHealthRecordUseCase;
  let update: UpdateHealthRecordUseCase;
  let remove: DeleteHealthRecordUseCase;

  beforeEach(() => {
    records = new InMemoryHealthRecordRepository();
    reminders = new InMemoryReminderRepository();
    storage = new InMemoryAttachmentStorage();
    const port = consultationReminders(reminders);
    const unitOfWork = new InMemoryUnitOfWork([records, reminders]);
    create = new CreateHealthRecordUseCase(records, port, unitOfWork);
    update = new UpdateHealthRecordUseCase(records, port, unitOfWork);
    remove = new DeleteHealthRecordUseCase(records, port, storage, unitOfWork);
  });

  const newConsultation = (extra: object = {}) =>
    create.execute({
      holderId,
      kind: 'CONSULTATION',
      title: 'Cardiologia',
      occurredAt: inDays(7),
      followUpAt: inDays(37),
      reminder: { minutesBefore: ONE_DAY },
      ...extra,
    });

  it('grava a consulta futura e o aviso, com os dois eventos no outbox', async () => {
    const created = await newConsultation();

    expect(created.reminder).toEqual({ remindAt: inDays(6), status: 'SCHEDULED', version: 1 });
    expect(reminders.ofRecord(created.id)).toMatchObject({ holderId, version: 1, title: 'Cardiologia' });
    expect(records.published).toEqual([EVENT_TYPES.HEALTH_RECORD_CREATED]);
    expect(reminders.published).toEqual([EVENT_TYPES.REMINDER_SCHEDULED]);
  });

  it('se o aviso falha, a consulta também não fica gravada', async () => {
    reminders.failure = new Error('banco indisponível');

    await expect(newConsultation()).rejects.toThrow('banco indisponível');
    expect(records.items.size).toBe(0);
    expect(records.published).toEqual([]);
  });

  it('consulta passada sem aviso entra; com aviso é recusada antes de gravar', async () => {
    await expect(
      create.execute({ holderId, kind: 'CONSULTATION', title: 'Clínico', occurredAt: inDays(-30) }),
    ).resolves.toMatchObject({ reminder: null });
    await expect(newConsultation({ occurredAt: inDays(-30), followUpAt: undefined })).rejects.toThrow(
      DomainError,
    );
    expect(records.items.size).toBe(1);
  });

  it('repetir o envio com o mesmo id devolve o mesmo registro, sem duplicar', async () => {
    const first = await newConsultation({ id: clientId });
    const repeated = await newConsultation({ id: clientId });

    expect(repeated).toEqual(first);
    expect(records.items.size).toBe(1);
    expect(reminders.items.size).toBe(1);
  });

  it('id que pertence a outro titular é recusado sem tocar no registro dele', async () => {
    await newConsultation({ id: clientId, holderId: otherHolder });

    await expect(newConsultation({ id: clientId })).rejects.toThrow(ConflictError);
    expect(records.items.get(clientId)?.holderId).toBe(otherHolder);
  });

  it('remarcar reagenda o aviso com a mesma antecedência, em nova versão', async () => {
    const { id } = await newConsultation();

    const updated = await update.execute({ holderId, recordId: id, occurredAt: inDays(9) });

    expect(updated.reminder).toEqual({ remindAt: inDays(8), status: 'SCHEDULED', version: 2 });
    expect(reminders.published).toEqual([
      EVENT_TYPES.REMINDER_SCHEDULED,
      EVENT_TYPES.REMINDER_RESCHEDULED,
    ]);
  });

  it('reminder null cancela; reminder explícito reagenda com outra antecedência', async () => {
    const { id } = await newConsultation();

    const cancelled = await update.execute({ holderId, recordId: id, reminder: null });
    expect(cancelled.reminder).toMatchObject({ status: 'CANCELLED', version: 2 });

    const rescheduled = await update.execute({ holderId, recordId: id, reminder: { minutesBefore: 60 } });
    expect(rescheduled.reminder).toMatchObject({ status: 'SCHEDULED', version: 3 });
  });

  it('corrigir a consulta para uma data passada cancela o aviso pendente', async () => {
    const { id } = await newConsultation({ followUpAt: undefined });

    const updated = await update.execute({ holderId, recordId: id, occurredAt: inDays(-2) });

    expect(updated.reminder).toMatchObject({ status: 'CANCELLED', version: 2 });
  });

  it('corrigir sem mudar a data não mexe no aviso', async () => {
    const { id } = await newConsultation();

    const updated = await update.execute({ holderId, recordId: id, location: 'Clínica Norte' });

    expect(updated).toMatchObject({ location: 'Clínica Norte', reminder: { version: 1 } });
  });

  it('regra violada na correção não grava nada', async () => {
    const { id } = await newConsultation();

    await expect(
      update.execute({ holderId, recordId: id, occurredAt: inDays(60) }),
    ).rejects.toThrow(new DomainError('O retorno precisa ser posterior à consulta.'));
    expect(records.items.get(id)?.occurredAt).toEqual(inDays(7));
    expect(reminders.ofRecord(id)?.version).toBe(1);
  });

  it('outro titular não altera nem exclui: recurso indisponível e nada muda', async () => {
    const { id } = await newConsultation();

    await expect(update.execute({ holderId: otherHolder, recordId: id, reminder: null })).rejects.toThrow(
      NotFoundError,
    );
    await expect(remove.execute({ holderId: otherHolder, recordId: id })).rejects.toThrow(NotFoundError);
    expect(records.items.has(id)).toBe(true);
    expect(reminders.ofRecord(id)).toMatchObject({ status: 'SCHEDULED', version: 1 });
  });

  it('excluir remove a consulta (e o retorno) e cancela o aviso pendente', async () => {
    const { id } = await newConsultation();

    await remove.execute({ holderId, recordId: id });

    expect(records.items.has(id)).toBe(false);
    expect(reminders.ofRecord(id)).toMatchObject({ status: 'CANCELLED', version: 2 });
  });
});
