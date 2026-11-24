import { UnitOfWork } from '../../../core/application/unit-of-work.port';
import { UseCase } from '../../../core/application/use-case';
import { NotFoundError } from '../../../core/domain/errors';
import { HealthRecordRepository } from '../domain/health-record.repository';
import { AttachmentStorage } from './attachment-storage.port';
import { ConsultationReminders } from './consultation-reminders.port';

/**
 * Exclui o registro (RF1.1): a consulta leva junto o retorno, que vive nela,
 * e o aviso pendente é cancelado na mesma transação. Os arquivos dos anexos
 * são apagados do armazenamento depois da confirmação.
 */
export class DeleteHealthRecordUseCase
  implements UseCase<{ holderId: string; recordId: string }, void>
{
  constructor(
    private readonly records: HealthRecordRepository,
    private readonly reminders: ConsultationReminders,
    private readonly storage: AttachmentStorage,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: { holderId: string; recordId: string }): Promise<void> {
    const keys = await this.unitOfWork.run(async () => {
      const record = await this.records.findById(input.recordId);
      if (!record || !record.belongsTo(input.holderId)) {
        throw new NotFoundError('Registro');
      }
      await this.records.delete(record.id);
      await this.reminders.cancel(input);
      return record.toSnapshot().attachments.map((attachment) => attachment.storageKey);
    });

    if (keys.length > 0) {
      await this.storage.deleteObjects(keys);
    }
  }
}
