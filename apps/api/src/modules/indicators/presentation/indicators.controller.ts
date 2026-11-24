import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ListIndicatorsUseCase } from '../application/list-indicators.use-case';
import { RecordIndicatorUseCase } from '../application/record-indicator.use-case';
import { IndicatorProps } from '../domain/indicator';
import { RecordIndicatorDto } from './record-indicator.dto';

@Controller('holders/:holderId/indicators')
export class IndicatorsController {
  constructor(
    private readonly recordIndicator: RecordIndicatorUseCase,
    private readonly listIndicators: ListIndicatorsUseCase,
  ) {}

  @Post()
  record(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Body() body: RecordIndicatorDto,
  ): Promise<IndicatorProps> {
    return this.recordIndicator.execute({ holderId, ...body });
  }

  @Get()
  list(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Query('type') type?: string,
  ): Promise<IndicatorProps[]> {
    return this.listIndicators.execute({ holderId, type });
  }
}
