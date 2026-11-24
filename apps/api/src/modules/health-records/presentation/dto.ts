import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { HEALTH_RECORD_KINDS, HealthRecordKind } from '../domain/health-record';

export class CreateHealthRecordDto {
  @IsIn(HEALTH_RECORD_KINDS)
  kind!: HealthRecordKind;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Type(() => Date)
  @IsDate()
  occurredAt!: Date;
}

export class RequestAttachmentUploadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsInt()
  @Min(1)
  sizeBytes!: number;
}
