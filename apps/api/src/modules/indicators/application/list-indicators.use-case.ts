import { UseCase } from '../../../core/application/use-case';
import { IndicatorProps } from '../domain/indicator';
import { IndicatorRepository } from '../domain/indicator.repository';

export interface ListIndicatorsInput {
  holderId: string;
  type?: string;
}

export class ListIndicatorsUseCase
  implements UseCase<ListIndicatorsInput, IndicatorProps[]>
{
  constructor(private readonly indicators: IndicatorRepository) {}

  async execute({ holderId, type }: ListIndicatorsInput): Promise<IndicatorProps[]> {
    const indicators = await this.indicators.listByHolder(
      holderId,
      type?.trim().toLowerCase() || undefined,
    );
    return indicators.map((indicator) => indicator.toSnapshot());
  }
}
