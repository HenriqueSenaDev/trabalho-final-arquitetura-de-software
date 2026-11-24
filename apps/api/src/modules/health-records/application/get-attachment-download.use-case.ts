import { UseCase } from '../../../core/application/use-case';
import { NotFoundError } from '../../../core/domain/errors';
import { HealthRecordRepository } from '../domain/health-record.repository';
import { AttachmentStorage, SignedUrl } from './attachment-storage.port';

export interface GetAttachmentDownloadInput {
  holderId: string;
  recordId: string;
  attachmentId: string;
}

export class GetAttachmentDownloadUseCase
  implements UseCase<GetAttachmentDownloadInput, SignedUrl>
{
  constructor(
    private readonly records: HealthRecordRepository,
    private readonly storage: AttachmentStorage,
  ) {}

  async execute(input: GetAttachmentDownloadInput): Promise<SignedUrl> {
    const record = await this.records.findById(input.recordId);
    if (!record || !record.belongsTo(input.holderId)) {
      throw new NotFoundError('Registro');
    }

    const attachment = record
      .toSnapshot()
      .attachments.find((item) => item.id === input.attachmentId);
    if (!attachment) {
      throw new NotFoundError('Anexo');
    }

    return this.storage.createDownloadUrl(attachment.storageKey);
  }
}
