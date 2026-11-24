import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { HEALTH_RECORD_KINDS, HealthRecordKind } from '../domain/health-record';

/** Aviso da consulta: de 5 minutos a 7 dias antes. */
export class ReminderRequestDto {
  @IsInt()
  @Min(5)
  @Max(7 * 24 * 60)
  minutesBefore!: number;
}

export class CreateHealthRecordDto {
  /** Gerado pelo aplicativo: repetir o envio com o mesmo id não duplica o registro. */
  @IsOptional()
  @IsUUID()
  id?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(120)
  professional?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  /** Retorno vinculado (só consulta). */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  followUpAt?: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReminderRequestDto)
  reminder?: ReminderRequestDto;
}

/** Valida só quando o campo veio; `null` não é aceito em campo obrigatório. */
const IfSent = () => ValidateIf((_object, value) => value !== undefined);

/**
 * Correção parcial. Campo ausente fica como está; nos opcionais, `null`
 * apaga o valor; em `reminder`, `null` cancela o aviso.
 */
export class UpdateHealthRecordDto {
  @IfSent()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IfSent()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  professional?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  followUpAt?: Date | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReminderRequestDto)
  reminder?: ReminderRequestDto | null;
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
