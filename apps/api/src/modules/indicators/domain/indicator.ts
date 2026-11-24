import { randomUUID } from 'node:crypto';
import { EVENT_TYPES } from '@personal-health/contracts';
import { AggregateRoot } from '../../../core/domain/aggregate-root';
import { DomainError } from '../../../core/domain/errors';

export interface IndicatorProps {
  id: string;
  holderId: string;
  type: string;
  value: number;
  unit: string;
  measuredAt: Date;
  createdAt: Date;
}

/** Medição pontual de um indicador de saúde (peso, glicemia, pressão…). */
export class Indicator extends AggregateRoot {
  private constructor(private readonly props: IndicatorProps) {
    super();
  }

  static record(
    input: { holderId: string; type: string; value: number; unit: string; measuredAt: Date },
    now = new Date(),
  ): Indicator {
    const type = input.type.trim().toLowerCase();
    const unit = input.unit.trim();
    if (!type || !unit) {
      throw new DomainError('Informe o tipo e a unidade do indicador.');
    }
    if (!Number.isFinite(input.value)) {
      throw new DomainError('O valor do indicador precisa ser numérico.');
    }
    if (input.measuredAt.getTime() > now.getTime()) {
      throw new DomainError('A medição não pode estar no futuro.');
    }

    const indicator = new Indicator({
      id: randomUUID(),
      holderId: input.holderId,
      type,
      value: input.value,
      unit,
      measuredAt: input.measuredAt,
      createdAt: now,
    });

    indicator.record({
      type: EVENT_TYPES.INDICATOR_RECORDED,
      aggregateType: 'indicator',
      aggregateId: indicator.props.id,
      occurredAt: now,
      payload: {
        indicatorId: indicator.props.id,
        holderId: indicator.props.holderId,
        type,
        value: input.value,
        unit,
        measuredAt: input.measuredAt.toISOString(),
      },
    });

    return indicator;
  }

  static restore(props: IndicatorProps): Indicator {
    return new Indicator({ ...props });
  }

  toSnapshot(): IndicatorProps {
    return { ...this.props };
  }
}
