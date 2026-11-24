import { randomUUID } from 'node:crypto';
import { EVENT_TYPES } from '@personal-health/contracts';
import { AggregateRoot } from '../../../core/domain/aggregate-root';
import { DomainError } from '../../../core/domain/errors';

export const HEALTH_RECORD_KINDS = [
  'CONSULTATION',
  'EXAM',
  'VACCINE',
  'PRESCRIPTION',
  'OTHER',
] as const;

export type HealthRecordKind = (typeof HEALTH_RECORD_KINDS)[number];

export interface AttachmentProps {
  id: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface HealthRecordProps {
  id: string;
  holderId: string;
  kind: HealthRecordKind;
  title: string;
  description: string | null;
  occurredAt: Date;
  createdAt: Date;
  attachments: AttachmentProps[];
}

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

/** Registro do histórico de saúde do titular (consulta, exame, vacina…). */
export class HealthRecord extends AggregateRoot {
  private constructor(private readonly props: HealthRecordProps) {
    super();
  }

  static create(
    input: {
      holderId: string;
      kind: HealthRecordKind;
      title: string;
      description?: string | null;
      occurredAt: Date;
    },
    now = new Date(),
  ): HealthRecord {
    const title = input.title.trim();
    if (!title) {
      throw new DomainError('O registro precisa de um título.');
    }
    if (input.occurredAt.getTime() > now.getTime()) {
      throw new DomainError('A data do registro não pode estar no futuro.');
    }

    const record = new HealthRecord({
      id: randomUUID(),
      holderId: input.holderId,
      kind: input.kind,
      title,
      description: input.description ?? null,
      occurredAt: input.occurredAt,
      createdAt: now,
      attachments: [],
    });

    record.record({
      type: EVENT_TYPES.HEALTH_RECORD_CREATED,
      aggregateType: 'health-record',
      aggregateId: record.id,
      occurredAt: now,
      payload: {
        recordId: record.id,
        holderId: record.holderId,
        kind: record.props.kind,
        occurredAt: record.props.occurredAt.toISOString(),
      },
    });

    return record;
  }

  static restore(props: HealthRecordProps): HealthRecord {
    return new HealthRecord({ ...props, attachments: [...props.attachments] });
  }

  /** Reserva a chave do anexo; o binário é enviado direto ao armazenamento. */
  attach(
    input: { fileName: string; mimeType: string; sizeBytes: number },
    now = new Date(),
  ): AttachmentProps {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(input.mimeType)) {
      throw new DomainError('Tipo de arquivo não suportado.');
    }
    if (input.sizeBytes <= 0 || input.sizeBytes > MAX_ATTACHMENT_BYTES) {
      throw new DomainError('O anexo precisa ter até 20 MB.');
    }

    const id = randomUUID();
    const safeName = input.fileName.replace(/[^\w.-]+/g, '_');
    const attachment: AttachmentProps = {
      id,
      storageKey: `holders/${this.holderId}/records/${this.id}/${id}-${safeName}`,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      createdAt: now,
    };
    this.props.attachments.push(attachment);
    return attachment;
  }

  belongsTo(holderId: string): boolean {
    return this.props.holderId === holderId;
  }

  get id(): string {
    return this.props.id;
  }

  get holderId(): string {
    return this.props.holderId;
  }

  toSnapshot(): HealthRecordProps {
    return { ...this.props, attachments: [...this.props.attachments] };
  }
}
