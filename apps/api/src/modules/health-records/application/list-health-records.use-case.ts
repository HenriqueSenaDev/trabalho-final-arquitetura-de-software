import { UseCase } from '../../../core/application/use-case';
import { HealthRecordProps } from '../domain/health-record';
import { HealthRecordRepository } from '../domain/health-record.repository';

export class ListHealthRecordsUseCase
  implements UseCase<{ holderId: string }, HealthRecordProps[]>
{
  constructor(private readonly records: HealthRecordRepository) {}

  async execute({ holderId }: { holderId: string }): Promise<HealthRecordProps[]> {
    const records = await this.records.listByHolder(holderId);
    return records.map((record) => record.toSnapshot());
  }
}
