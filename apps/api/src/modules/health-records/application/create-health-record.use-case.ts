import { UnitOfWork } from '../../../core/application/unit-of-work.port';
import { UseCase } from '../../../core/application/use-case';
import { ConflictError } from '../../../core/domain/errors';
import {
  HealthRecord,
  HealthRecordInput,
  HealthRecordProps,
} from '../domain/health-record';
import { HealthRecordRepository } from '../domain/health-record.repository';
import { ConsultationReminder, ConsultationReminders } from './consultation-reminders.port';

export interface CreateHealthRecordInput extends HealthRecordInput {
  /** Aviso da consulta: quantos minutos antes do acontecimento. */
  reminder?: { minutesBefore: number };
}

export type HealthRecordWithReminder = HealthRecordProps & {
  reminder: ConsultationReminder | null;
};

/**
 * Registra o item do histórico. Para uma consulta com aviso, grava a
 * consulta e o lembrete na mesma transação: ou os dois, ou nenhum.
 *
 * Com o `id` gerado pelo aplicativo, repetir o envio (depois de perder a
 * resposta por falta de conexão) devolve o registro já gravado.
 */
export class CreateHealthRecordUseCase
  implements UseCase<CreateHealthRecordInput, HealthRecordWithReminder>
{
  constructor(
    private readonly records: HealthRecordRepository,
    private readonly reminders: ConsultationReminders,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateHealthRecordInput): Promise<HealthRecordWithReminder> {
    if (input.id) {
      const repeated = await this.alreadyCreated(input.id, input.holderId);
      if (repeated) {
        return repeated;
      }
    }

    const now = new Date();
    const record = HealthRecord.create(input, now);
    const remindAt = input.reminder ? record.reminderTimeFor(input.reminder.minutesBefore, now) : null;

    const created = await this.unitOfWork.run(async () => {
      if (!(await this.records.create(record))) {
        return null;
      }
      const reminder = remindAt
        ? await this.reminders.schedule({
            holderId: record.holderId,
            recordId: record.id,
            title: record.title,
            remindAt,
          })
        : null;
      return { ...record.toSnapshot(), reminder };
    });

    // Dois envios do mesmo pedido ao mesmo tempo: o primeiro gravou.
    return created ?? (await this.alreadyCreated(record.id, input.holderId)) ?? conflict();
  }

  private async alreadyCreated(id: string, holderId: string): Promise<HealthRecordWithReminder | null> {
    const existing = await this.records.findById(id);
    if (!existing) {
      return null;
    }
    if (!existing.belongsTo(holderId)) {
      conflict();
    }
    const reminder = await this.reminders.find({ holderId, recordId: id });
    return { ...existing.toSnapshot(), reminder };
  }
}

function conflict(): never {
  throw new ConflictError('Este identificador já está em uso.');
}
