import { Injectable } from '@nestjs/common';
import { Indicator as IndicatorRow } from '@personal-health/database';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { toOutboxRows } from '../../../infrastructure/outbox/outbox';
import { Indicator } from '../domain/indicator';
import { IndicatorRepository } from '../domain/indicator.repository';

@Injectable()
export class PrismaIndicatorRepository extends IndicatorRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(indicator: Indicator): Promise<void> {
    const data = indicator.toSnapshot();
    const events = indicator.pullEvents();

    await this.prisma.$transaction([
      this.prisma.indicator.create({ data }),
      this.prisma.outboxEvent.createMany({ data: toOutboxRows(events) }),
    ]);
  }

  async listByHolder(holderId: string, type?: string): Promise<Indicator[]> {
    const rows = await this.prisma.indicator.findMany({
      where: { holderId, ...(type ? { type } : {}) },
      orderBy: { measuredAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: IndicatorRow): Indicator {
    return Indicator.restore({
      id: row.id,
      holderId: row.holderId,
      type: row.type,
      value: row.value.toNumber(),
      unit: row.unit,
      measuredAt: row.measuredAt,
      createdAt: row.createdAt,
    });
  }
}
