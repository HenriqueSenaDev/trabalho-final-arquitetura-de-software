import { Indicator } from './indicator';

export abstract class IndicatorRepository {
  /** Persiste a medição e os eventos pendentes dela de forma atômica. */
  abstract create(indicator: Indicator): Promise<void>;
  abstract listByHolder(holderId: string, type?: string): Promise<Indicator[]>;
}
