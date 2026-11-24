import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class AlterarExameDto {
  @ValidateIf((_obj, valor) => valor !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  tipo?: string;

  @ValidateIf((_obj, valor) => valor !== undefined)
  @Type(() => Date)
  @IsDate()
  dataRealizacao?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  laboratorio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string | null;
}
