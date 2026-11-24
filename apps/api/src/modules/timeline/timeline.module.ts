import { Module } from '@nestjs/common';
import { GetTimelineUseCase } from './application/get-timeline.use-case';
import { TimelineReader } from './domain/timeline';
import { SqlTimelineReader } from './infrastructure/sql-timeline-reader';
import { TimelineController } from './presentation/timeline.controller';

/**
 * Linha do tempo (ADR 02): leitura dos registros vigentes do histórico. Não
 * grava nada; é o único módulo que lê a tabela de outro (health_records).
 */
@Module({
  controllers: [TimelineController],
  providers: [
    { provide: TimelineReader, useClass: SqlTimelineReader },
    {
      provide: GetTimelineUseCase,
      inject: [TimelineReader],
      useFactory: (reader: TimelineReader) => new GetTimelineUseCase(reader),
    },
  ],
})
export class TimelineModule {}
