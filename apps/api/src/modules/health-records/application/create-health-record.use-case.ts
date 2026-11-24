import { UseCase } from '../../../core/application/use-case';
import {
  HealthRecord,
  HealthRecordKind,
  HealthRecordProps,
} from '../domain/health-record';
import { HealthRecordRepository } from '../domain/health-record.repository';

export interface CreateHealthRecordInput {
  holderId: string;
  kind: HealthRecordKind;
  title: string;
  description?: string;
  occurredAt: Date;
}

export class CreateHealthRecordUseCase
  implements UseCase<CreateHealthRecordInput, HealthRecordProps>
{
  constructor(private readonly records: HealthRecordRepository) {}

  async execute(input: CreateHealthRecordInput): Promise<HealthRecordProps> {
    const record = HealthRecord.create(input);
    await this.records.create(record);
    return record.toSnapshot();
  }
}
