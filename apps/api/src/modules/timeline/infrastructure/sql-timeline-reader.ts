import { Injectable } from '@nestjs/common';
import { Prisma } from '@personal-health/database';
import { TransactionContext } from '../../../infrastructure/database/transaction-context';
import {
  TimelineFilter,
  TimelineItem,
  TimelinePosition,
  TimelineReader,
} from '../domain/timeline';

/**
 * Adapter da porta de leitura (ADR 02). Monta a projeção na hora da
 * consulta, direto sobre `health_records`, paginada por titular, data, tipo e
 * identificador. O retorno da consulta (`follow_up_at`) vira um item próprio.
 *
 * As colunas são `timestamp` em UTC; os instantes entram como texto ISO
 * convertido para `timestamp`, o que independe do fuso da sessão do banco.
 */
@Injectable()
export class SqlTimelineReader extends TimelineReader {
  constructor(private readonly db: TransactionContext) {
    super();
  }

  upcoming(filter: TimelineFilter, now: Date, limit: number): Promise<TimelineItem[]> {
    return this.read(
      filter,
      Prisma.sql`date > ${utc(now)}`,
      Prisma.sql`ORDER BY date ASC, type ASC, id ASC`,
      limit,
    );
  }

  past(
    filter: TimelineFilter,
    now: Date,
    after: TimelinePosition | null,
    limit: number,
  ): Promise<TimelineItem[]> {
    const continuation = after
      ? Prisma.sql`AND (date, type, id) < (${utc(after.date)}, ${after.type}, ${after.id}::uuid)`
      : Prisma.empty;
    return this.read(
      filter,
      Prisma.sql`date <= ${utc(now)} ${continuation}`,
      Prisma.sql`ORDER BY date DESC, type DESC, id DESC`,
      limit,
    );
  }

  private async read(
    filter: TimelineFilter,
    window: Prisma.Sql,
    order: Prisma.Sql,
    limit: number,
  ): Promise<TimelineItem[]> {
    const holder = Prisma.sql`${filter.holderId}::uuid`;
    const types = filter.types?.length
      ? Prisma.sql`AND type = ANY(${filter.types}::text[])`
      : Prisma.empty;
    const from = filter.from ? Prisma.sql`AND date >= ${utc(filter.from)}` : Prisma.empty;
    const to = filter.to ? Prisma.sql`AND date < ${utc(filter.to)}` : Prisma.empty;

    const rows = await this.db.client.$queryRaw<TimelineItem[]>`
      WITH timeline AS (
        SELECT kind::text AS type, id, occurred_at AS date, title, location AS detail
          FROM health_records
         WHERE holder_id = ${holder}
        UNION ALL
        SELECT 'FOLLOW_UP'::text, id, follow_up_at, title, professional
          FROM health_records
         WHERE holder_id = ${holder} AND follow_up_at IS NOT NULL
      )
      SELECT type, id, date, title, detail
        FROM timeline
       WHERE ${window} ${types} ${from} ${to}
      ${order}
       LIMIT ${limit}
    `;

    return rows.map((row) => ({ ...row, date: new Date(row.date) }));
  }
}

function utc(instant: Date): Prisma.Sql {
  return Prisma.sql`${instant.toISOString()}::timestamp`;
}
