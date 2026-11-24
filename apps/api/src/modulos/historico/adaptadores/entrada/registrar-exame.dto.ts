import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegistrarExameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  tipo!: string;

  @Type(() => Date)
  @IsDate()
  dataRealizacao!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  laboratorio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}
