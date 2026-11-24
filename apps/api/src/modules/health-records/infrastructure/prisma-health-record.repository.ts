import { Injectable } from '@nestjs/common';
import {
  Attachment as AttachmentRow,
  HealthRecord as HealthRecordRow,
} from '@personal-health/database';
import { TransactionContext } from '../../../infrastructure/database/transaction-context';
import { toOutboxRows } from '../../../infrastructure/outbox/outbox';
import { AttachmentProps, HealthRecord } from '../domain/health-record';
import { HealthRecordRepository } from '../domain/health-record.repository';

type RowWithAttachments = HealthRecordRow & { attachments: AttachmentRow[] };

@Injectable()
export class PrismaHealthRecordRepository extends HealthRecordRepository {
  constructor(private readonly db: TransactionContext) {
    super();
  }

  async create(record: HealthRecord): Promise<boolean> {
    const { attachments: _attachments, ...data } = record.toSnapshot();
    const events = record.pullEvents();

    // Dentro da UnitOfWork da requisição, quando houver (consulta + aviso).
    return this.db.run(async (client) => {
      // ON CONFLICT DO NOTHING: um envio repetido com o mesmo id não duplica.
      const { count } = await client.healthRecord.createMany({
        data: [data],
        skipDuplicates: true,
      });
      if (count === 0) {
        return false;
      }
      await client.outboxEvent.createMany({ data: toOutboxRows(events) });
      return true;
    });
  }

  async update(record: HealthRecord): Promise<void> {
    const { id, attachments: _attachments, holderId: _holderId, kind: _kind, createdAt: _createdAt, ...data } =
      record.toSnapshot();
    await this.db.run((client) => client.healthRecord.update({ where: { id }, data }));
  }

  async delete(id: string): Promise<void> {
    await this.db.run((client) => client.healthRecord.delete({ where: { id } }));
  }

  async addAttachment(recordId: string, attachment: AttachmentProps): Promise<void> {
    await this.db.client.attachment.create({ data: { ...attachment, recordId } });
  }

  async findById(id: string): Promise<HealthRecord | null> {
    const row = await this.db.client.healthRecord.findUnique({
      where: { id },
      include: { attachments: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async listByHolder(holderId: string): Promise<HealthRecord[]> {
    const rows = await this.db.client.healthRecord.findMany({
      where: { holderId },
      include: { attachments: true },
      orderBy: { occurredAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: RowWithAttachments): HealthRecord {
    return HealthRecord.restore({
      id: row.id,
      holderId: row.holderId,
      kind: row.kind,
      title: row.title,
      description: row.description,
      occurredAt: row.occurredAt,
      professional: row.professional,
      location: row.location,
      followUpAt: row.followUpAt,
      createdAt: row.createdAt,
      attachments: row.attachments.map((attachment) => ({
        id: attachment.id,
        storageKey: attachment.storageKey,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        createdAt: attachment.createdAt,
      })),
    });
  }
}
