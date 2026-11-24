import { UseCase } from '../../../core/application/use-case';
import { NotFoundError } from '../../../core/domain/errors';
import { HealthRecordRepository } from '../domain/health-record.repository';
import { ConsultationReminders } from './consultation-reminders.port';
import { HealthRecordWithReminder } from './create-health-record.use-case';

/** Detalhe de um item da linha do tempo, com a situação do aviso. */
export class GetHealthRecordUseCase
  implements UseCase<{ holderId: string; recordId: string }, HealthRecordWithReminder>
{
  constructor(
    private readonly records: HealthRecordRepository,
    private readonly reminders: ConsultationReminders,
  ) {}

  async execute(input: { holderId: string; recordId: string }): Promise<HealthRecordWithReminder> {
    const record = await this.records.findById(input.recordId);
    if (!record || !record.belongsTo(input.holderId)) {
      throw new NotFoundError('Registro');
    }
    const reminder = await this.reminders.find(input);
    return { ...record.toSnapshot(), reminder };
  }
}
