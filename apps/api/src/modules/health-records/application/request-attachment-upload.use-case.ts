import { UseCase } from '../../../core/application/use-case';
import { NotFoundError } from '../../../core/domain/errors';
import { AttachmentProps } from '../domain/health-record';
import { HealthRecordRepository } from '../domain/health-record.repository';
import { AttachmentStorage, SignedUrl } from './attachment-storage.port';

export interface RequestAttachmentUploadInput {
  holderId: string;
  recordId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface RequestAttachmentUploadOutput {
  attachment: AttachmentProps;
  upload: SignedUrl;
}

export class RequestAttachmentUploadUseCase
  implements UseCase<RequestAttachmentUploadInput, RequestAttachmentUploadOutput>
{
  constructor(
    private readonly records: HealthRecordRepository,
    private readonly storage: AttachmentStorage,
  ) {}

  async execute(
    input: RequestAttachmentUploadInput,
  ): Promise<RequestAttachmentUploadOutput> {
    const record = await this.records.findById(input.recordId);
    if (!record || !record.belongsTo(input.holderId)) {
      throw new NotFoundError('Registro');
    }

    const attachment = record.attach(input);
    await this.records.addAttachment(record.id, attachment);
    const upload = await this.storage.createUploadUrl(
      attachment.storageKey,
      attachment.mimeType,
    );

    return { attachment, upload };
  }
}
