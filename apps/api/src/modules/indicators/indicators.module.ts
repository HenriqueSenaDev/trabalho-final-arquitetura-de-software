import { Module } from '@nestjs/common';
import { ListIndicatorsUseCase } from './application/list-indicators.use-case';
import { RecordIndicatorUseCase } from './application/record-indicator.use-case';
import { IndicatorRepository } from './domain/indicator.repository';
import { PrismaIndicatorRepository } from './infrastructure/prisma-indicator.repository';
import { IndicatorsController } from './presentation/indicators.controller';

@Module({
  controllers: [IndicatorsController],
  providers: [
    { provide: IndicatorRepository, useClass: PrismaIndicatorRepository },
    {
      provide: RecordIndicatorUseCase,
      inject: [IndicatorRepository],
      useFactory: (repo: IndicatorRepository) => new RecordIndicatorUseCase(repo),
    },
    {
      provide: ListIndicatorsUseCase,
      inject: [IndicatorRepository],
      useFactory: (repo: IndicatorRepository) => new ListIndicatorsUseCase(repo),
    },
  ],
})
export class IndicatorsModule {}
