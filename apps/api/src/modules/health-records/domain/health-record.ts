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
  /** Consulta (RF1.1): profissional, local e retorno vinculado. */
  professional: string | null;
  location: string | null;
  followUpAt: Date | null;
  createdAt: Date;
  attachments: AttachmentProps[];
}

export interface HealthRecordInput {
  /** Gerado pelo aplicativo quando ele quer poder repetir o envio sem duplicar. */
  id?: string;
  holderId: string;
  kind: HealthRecordKind;
  title: string;
  description?: string | null;
  occurredAt: Date;
  professional?: string | null;
  location?: string | null;
  followUpAt?: Date | null;
}

/** Correção: campo ausente fica como está; `null` apaga um campo opcional. */
export interface HealthRecordChanges {
  title?: string;
  description?: string | null;
  occurredAt?: Date;
  professional?: string | null;
  location?: string | null;
  followUpAt?: Date | null;
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

  static create(input: HealthRecordInput, now = new Date()): HealthRecord {
    const record = new HealthRecord(
      HealthRecord.validate(
        {
          id: input.id ?? randomUUID(),
          holderId: input.holderId,
          kind: input.kind,
          title: input.title.trim(),
          description: optionalText(input.description),
          occurredAt: input.occurredAt,
          professional: optionalText(input.professional),
          location: optionalText(input.location),
          followUpAt: input.followUpAt ?? null,
          createdAt: now,
          attachments: [],
        },
        now,
      ),
    );

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

  /**
   * Correção (invariantes da seção 4): mantém identidade, titular, tipo e
   * data de registro; a nova data reposiciona o item na linha do tempo.
   */
  correct(changes: HealthRecordChanges, now = new Date()): HealthRecord {
    const props = { ...this.props, attachments: [...this.props.attachments] };
    if (changes.title !== undefined) props.title = changes.title.trim();
    if (changes.description !== undefined) props.description = optionalText(changes.description);
    if (changes.occurredAt !== undefined) props.occurredAt = changes.occurredAt;
    if (changes.professional !== undefined) props.professional = optionalText(changes.professional);
    if (changes.location !== undefined) props.location = optionalText(changes.location);
    if (changes.followUpAt !== undefined) props.followUpAt = changes.followUpAt;
    return new HealthRecord(HealthRecord.validate(props, now));
  }

  /**
   * Instante do aviso pedido para a consulta. Só existe aviso para consulta
   * futura, e ele não pode cair no passado.
   */
  reminderTimeFor(minutesBefore: number, now = new Date()): Date {
    if (this.props.kind !== 'CONSULTATION') {
      throw new DomainError('Só consultas têm aviso.');
    }
    if (this.props.occurredAt.getTime() <= now.getTime()) {
      throw new DomainError('Só é possível pedir aviso para uma consulta futura.');
    }
    const remindAt = this.minutesBeforeOccurrence(minutesBefore);
    if (remindAt.getTime() <= now.getTime()) {
      throw new DomainError('Com essa antecedência o aviso ficaria no passado.');
    }
    return remindAt;
  }

  /**
   * Remarcação sem novo pedido de aviso: mantém a antecedência se o aviso
   * ainda couber no futuro; senão a consulta fica sem aviso (null).
   */
  keptReminderTime(minutesBefore: number, now = new Date()): Date | null {
    const remindAt = this.minutesBeforeOccurrence(minutesBefore);
    return this.props.occurredAt.getTime() > now.getTime() && remindAt.getTime() > now.getTime()
      ? remindAt
      : null;
  }

  /** Quantos minutos antes do acontecimento cai o instante informado. */
  minutesBefore(instant: Date): number {
    return Math.round((this.props.occurredAt.getTime() - instant.getTime()) / 60_000);
  }

  private minutesBeforeOccurrence(minutes: number): Date {
    return new Date(this.props.occurredAt.getTime() - minutes * 60_000);
  }

  private static validate(props: HealthRecordProps, now: Date): HealthRecordProps {
    if (!props.title) {
      throw new DomainError('O registro precisa de um título.');
    }
    // RF1.1: consulta pode ser passada ou futura; os demais registros são do passado.
    if (props.kind !== 'CONSULTATION' && props.occurredAt.getTime() > now.getTime()) {
      throw new DomainError('A data do registro não pode estar no futuro.');
    }
    if (props.followUpAt) {
      if (props.kind !== 'CONSULTATION') {
        throw new DomainError('Só consultas têm retorno.');
      }
      if (props.followUpAt.getTime() <= props.occurredAt.getTime()) {
        throw new DomainError('O retorno precisa ser posterior à consulta.');
      }
    }
    return props;
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

  get kind(): HealthRecordKind {
    return this.props.kind;
  }

  get title(): string {
    return this.props.title;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }

  toSnapshot(): HealthRecordProps {
    return { ...this.props, attachments: [...this.props.attachments] };
  }
}

function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}
