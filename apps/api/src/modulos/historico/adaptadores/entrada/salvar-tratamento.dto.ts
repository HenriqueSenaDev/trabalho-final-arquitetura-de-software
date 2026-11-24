import { Type } from 'class-transformer';
import {
  IsDate,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'frequenciaCompativel', async: false })
export class FrequenciaCompativel implements ValidatorConstraintInterface {
  validate(value: FrequenciaTratamentoDto | undefined): boolean {
    if (!value) return false;
    if (value.tipo === 'FIXA') {
      return Number.isInteger(value.intervaloHoras) && (value.intervaloHoras ?? 0) > 0;
    }
    return value.tipo === 'SOB_DEMANDA' && value.intervaloHoras === undefined;
  }

  defaultMessage(): string {
    return 'Frequência fixa exige intervalo inteiro positivo; sob demanda não aceita intervalo.';
  }
}

@ValidatorConstraint({ name: 'horarioInicialCompativel', async: false })
export class HorarioInicialCompativel implements ValidatorConstraintInterface {
  validate(value: string | undefined, args: ValidationArguments): boolean {
    const dto = args.object as SalvarTratamentoDto;
    if (dto.frequencia?.tipo === 'FIXA') {
      return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    }
    return value === undefined;
  }

  defaultMessage(): string {
    return 'Frequência fixa exige horário no formato HH:mm; sob demanda não aceita horário.';
  }
}

export class FrequenciaTratamentoDto {
  @IsIn(['FIXA', 'SOB_DEMANDA'])
  tipo!: 'FIXA' | 'SOB_DEMANDA';

  @IsOptional()
  @IsInt()
  @Min(1)
  intervaloHoras?: number;
}

export class SalvarTratamentoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  medicamento!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  dose!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  formaAdministracao!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => FrequenciaTratamentoDto)
  @Validate(FrequenciaCompativel)
  frequencia!: FrequenciaTratamentoDto;

  @Type(() => Date)
  @IsDate()
  dataInicio!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dataFim?: Date;

  @Validate(HorarioInicialCompativel)
  horarioInicial?: string;
}
