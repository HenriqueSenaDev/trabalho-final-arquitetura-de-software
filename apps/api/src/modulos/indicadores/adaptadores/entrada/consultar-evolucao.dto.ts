import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional } from 'class-validator';
import { TIPOS_DE_MEDICAO, TipoMedicao } from '../../dominio/medicao';

export class ConsultarEvolucaoDto {
  @IsIn(TIPOS_DE_MEDICAO)
  tipo: TipoMedicao;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  de?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  ate?: Date;
}
