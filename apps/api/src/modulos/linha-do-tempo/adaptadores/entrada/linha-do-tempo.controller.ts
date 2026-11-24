import { Controller, Get, Query } from '@nestjs/common';
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
import { Auditar } from '../../../../entrada-http/auditoria.interceptor';
import { TitularAutenticado } from '../../../../entrada-http/guarda-de-sessao';
import {
  ConsultarLinhaDoTempo,
  LIMITE_POR_PAGINA,
  PaginaLinhaDoTempo,
} from '../../aplicacao/consultar-linha-do-tempo';
import { TIPOS_DE_ITEM, TipoDeItem } from '../../portas/leitura-linha-do-tempo';

export class ConsultarLinhaDoTempoDto {
  /** Ex.: `?tipos=CONSULTA,RETORNO` */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsIn(TIPOS_DE_ITEM, { each: true })
  tipos?: TipoDeItem[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  de?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  ate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_POR_PAGINA)
  limite?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  fuso?: string;
}

/** Adaptador de entrada HTTP da Linha do Tempo. */
@Controller('linha-do-tempo')
export class LinhaDoTempoController {
  constructor(private readonly consultarLinhaDoTempo: ConsultarLinhaDoTempo) {}

  @Auditar('linha-do-tempo.consultar')
  @Get()
  consultar(
    @TitularAutenticado() titularId: string,
    @Query() consulta: ConsultarLinhaDoTempoDto,
  ): Promise<PaginaLinhaDoTempo> {
    const { tipos, de, ate, ...pagina } = consulta;
    return this.consultarLinhaDoTempo.executar({
      filtro: { titularId, tipos, de, ate },
      ...pagina,
    });
  }
}
