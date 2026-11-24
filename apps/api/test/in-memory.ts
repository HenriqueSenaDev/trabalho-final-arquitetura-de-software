/**
 * Adapters em memória para os testes de unidade do fluxo da consulta: os
 * casos de uso reais de health-records e reminders, sem banco.
 */
import { UnitOfWork } from '../src/core/application/unit-of-work.port';
import { ConflictError } from '../src/core/domain/errors';
import { AttachmentStorage, SignedUrl } from '../src/modules/health-records/application/attachment-storage.port';
import { HealthRecord, AttachmentProps } from '../src/modules/health-records/domain/health-record';
import { HealthRecordRepository } from '../src/modules/health-records/domain/health-record.repository';
import { RemindersModuleAdapter } from '../src/modules/health-records/infrastructure/reminders-module.adapter';
import { CancelConsultationReminderUseCase } from '../src/modules/reminders/application/cancel-consultation-reminder.use-case';
import { GetConsultationReminderUseCase } from '../src/modules/reminders/application/get-consultation-reminder.use-case';
import { ScheduleConsultationReminderUseCase } from '../src/modules/reminders/application/schedule-consultation-reminder.use-case';
import { Reminder, ReminderProps } from '../src/modules/reminders/domain/reminder';
import { ReminderRepository } from '../src/modules/reminders/domain/reminder.repository';

interface Participant {
  snapshot(): () => void;
}

/** Desfaz tudo o que os repositórios gravaram se o trabalho falhar. */
export class InMemoryUnitOfWork extends UnitOfWork {
  constructor(private readonly participants: Participant[]) {
    super();
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    const restores = this.participants.map((participant) => participant.snapshot());
    try {
      return await work();
    } catch (error) {
      restores.forEach((restore) => restore());
      throw error;
    }
  }
}

export class InMemoryHealthRecordRepository extends HealthRecordRepository {
  items = new Map<string, HealthRecord>();
  published: string[] = [];

  snapshot() {
    const copy = new Map(this.items);
    const published = [...this.published];
    return () => {
      this.items = copy;
      this.published = published;
    };
  }

  async create(record: HealthRecord): Promise<boolean> {
    if (this.items.has(record.id)) return false;
    this.items.set(record.id, record);
    this.published.push(...record.pullEvents().map((event) => event.type));
    return true;
  }

  async update(record: HealthRecord): Promise<void> {
    this.items.set(record.id, record);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async addAttachment(_recordId: string, _attachment: AttachmentProps): Promise<void> {}

  async findById(id: string): Promise<HealthRecord | null> {
    return this.items.get(id) ?? null;
  }

  async listByHolder(holderId: string): Promise<HealthRecord[]> {
    return [...this.items.values()].filter((record) => record.belongsTo(holderId));
  }
}

/** Guarda snapshots e confere a versão lida, como o adapter Prisma. */
export class InMemoryReminderRepository extends ReminderRepository {
  items = new Map<string, ReminderProps>();
  published: string[] = [];
  failure: Error | null = null;

  snapshot() {
    const copy = new Map([...this.items].map(([id, props]) => [id, { ...props }]));
    const published = [...this.published];
    return () => {
      this.items = copy;
      this.published = published;
    };
  }

  async save(reminder: Reminder): Promise<void> {
    if (this.failure) throw this.failure;
    const current = this.items.get(reminder.id);
    if ((current?.version ?? null) !== reminder.loadedVersion) {
      throw new ConflictError('O lembrete foi alterado por outra operação. Tente de novo.');
    }
    this.items.set(reminder.id, reminder.toSnapshot());
    this.published.push(...reminder.pullEvents().map((event) => event.type));
  }

  async findById(id: string): Promise<Reminder | null> {
    const props = this.items.get(id);
    return props ? Reminder.restore(props) : null;
  }

  async listByHolder(holderId: string): Promise<Reminder[]> {
    return [...this.items.values()].filter((p) => p.holderId === holderId).map((p) => Reminder.restore(p));
  }

  async findByRecord(holderId: string, recordId: string): Promise<Reminder | null> {
    const props = [...this.items.values()].find((p) => p.holderId === holderId && p.recordId === recordId);
    return props ? Reminder.restore(props) : null;
  }

  ofRecord(recordId: string): ReminderProps | undefined {
    return [...this.items.values()].find((props) => props.recordId === recordId);
  }
}

export class InMemoryAttachmentStorage extends AttachmentStorage {
  deleted: string[] = [];

  async createUploadUrl(key: string): Promise<SignedUrl> {
    return { url: `memory://${key}`, expiresAt: new Date() };
  }

  async createDownloadUrl(key: string): Promise<SignedUrl> {
    return { url: `memory://${key}`, expiresAt: new Date() };
  }

  async deleteObjects(keys: string[]): Promise<void> {
    this.deleted.push(...keys);
  }
}

/** A porta ConsultationReminders sobre os casos de uso reais do módulo reminders. */
export function consultationReminders(reminders: ReminderRepository): RemindersModuleAdapter {
  return new RemindersModuleAdapter(
    new ScheduleConsultationReminderUseCase(reminders),
    new CancelConsultationReminderUseCase(reminders),
    new GetConsultationReminderUseCase(reminders),
  );
}
