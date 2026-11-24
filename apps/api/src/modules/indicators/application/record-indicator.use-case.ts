import { UseCase } from '../../../core/application/use-case';
import { Indicator, IndicatorProps } from '../domain/indicator';
import { IndicatorRepository } from '../domain/indicator.repository';

export interface RecordIndicatorInput {
  holderId: string;
  type: string;
  value: number;
  unit: string;
  measuredAt: Date;
}

export class RecordIndicatorUseCase
  implements UseCase<RecordIndicatorInput, IndicatorProps>
{
  constructor(private readonly indicators: IndicatorRepository) {}

  async execute(input: RecordIndicatorInput): Promise<IndicatorProps> {
    const indicator = Indicator.record(input);
    await this.indicators.create(indicator);
    return indicator.toSnapshot();
  }
}
