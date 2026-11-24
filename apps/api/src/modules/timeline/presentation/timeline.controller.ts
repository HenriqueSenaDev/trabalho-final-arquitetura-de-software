import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Audit } from '../../../infrastructure/http/audit.interceptor';
import {
  GetTimelineUseCase,
  TIMELINE_PAGE_LIMIT,
  TimelinePage,
} from '../application/get-timeline.use-case';
import { TIMELINE_ITEM_TYPES, TimelineItemType } from '../domain/timeline';

export class TimelineQueryDto {
  /** Ex.: `?types=CONSULTATION,FOLLOW_UP` */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsIn(TIMELINE_ITEM_TYPES, { each: true })
  types?: TimelineItemType[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TIMELINE_PAGE_LIMIT)
  limit?: number;

  /** Fuso do aparelho, ex.: America/Fortaleza. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tz?: string;
}

@Controller('holders/:holderId/timeline')
export class TimelineController {
  constructor(private readonly getTimeline: GetTimelineUseCase) {}

  @Audit('timeline.get')
  @Get()
  get(
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Query() query: TimelineQueryDto,
  ): Promise<TimelinePage> {
    const { types, from, to, tz, ...page } = query;
    return this.getTimeline.execute({
      filter: { holderId, types, from, to },
      timeZone: tz,
      ...page,
    });
  }
}
