import { Injectable } from '@nestjs/common';
import {
  Attachment as AttachmentRow,
  HealthRecord as HealthRecordRow,
} from '@personal-health/database';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { toOutboxRows } from '../../../infrastructure/outbox/outbox';
import { AttachmentProps, HealthRecord } from '../domain/health-record';
import { HealthRecordRepository } from '../domain/health-record.repository';

type RowWithAttachments = HealthRecordRow & { attachments: AttachmentRow[] };

@Injectable()
export class PrismaHealthRecordRepository extends HealthRecordRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(record: HealthRecord): Promise<void> {
    const { attachments: _attachments, ...data } = record.toSnapshot();
    const events = record.pullEvents();

    await this.prisma.$transaction([
      this.prisma.healthRecord.create({ data }),
      this.prisma.outboxEvent.createMany({ data: toOutboxRows(events) }),
    ]);
  }

  async addAttachment(recordId: string, attachment: AttachmentProps): Promise<void> {
    await this.prisma.attachment.create({ data: { ...attachment, recordId } });
  }

  async findById(id: string): Promise<HealthRecord | null> {
    const row = await this.prisma.healthRecord.findUnique({
      where: { id },
      include: { attachments: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async listByHolder(holderId: string): Promise<HealthRecord[]> {
    const rows = await this.prisma.healthRecord.findMany({
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
