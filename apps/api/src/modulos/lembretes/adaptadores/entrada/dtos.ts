import { IsIn, IsInt, IsString, IsUUID, Min } from 'class-validator';

export class ConfigurarLembreteDto {
  @IsUUID() origemId!: string;

  @IsString() tipoOrigem!: string;

  @IsInt() @Min(0) antecedenciaMinutos!: number;
}

export class CancelarLembreteDto {
  @IsUUID() lembreteId!: string;
}

export class RespostaDoseDto {
  @IsIn(['CONFIRMADA', 'PULADA']) resposta!: 'CONFIRMADA' | 'PULADA';
}
