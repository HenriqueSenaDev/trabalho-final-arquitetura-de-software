import { Controller, Get, Param, Query } from '@nestjs/common';
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
  ConsultarDetalheItem,
  EncaminhamentoDetalhe,
} from '../../aplicacao/consultar-detalhe-item';
import {
  ConsultarLinhaDoTempo,
  LIMITE_POR_PAGINA,
  ResultadoLinhaDoTempo,
} from '../../aplicacao/consultar-linha-do-tempo';
import {
  normalizarTipoDeItem,
  TIPOS_DE_ITEM,
  TipoDeItem,
} from '../../portas/leitura-linha-do-tempo';

export class ConsultarLinhaDoTempoDto {
  /** Ex.: `?tipos=CONSULTA,RETORNO,MEDICAO` */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((item) => normalizarTipoDeItem(item.trim()));
    }
    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === 'string' ? normalizarTipoDeItem(item.trim()) : item,
      );
    }
    return value;
  })
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
  @Type(() => Date)
  @IsDate()
  dataInicial?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dataFinal?: Date;

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

  @IsOptional()
  @IsString()
  @MaxLength(64)
  fusoHorario?: string;
}

/** Adaptador de entrada HTTP da Linha do Tempo. */
@Controller('linha-do-tempo')
export class LinhaDoTempoController {
  constructor(
    private readonly consultarLinhaDoTempo: ConsultarLinhaDoTempo,
    private readonly consultarDetalheItem: ConsultarDetalheItem,
  ) {}

  @Auditar('linha-do-tempo.consultar')
  @Get()
  consultar(
    @TitularAutenticado() titularId: string,
    @Query() consulta: ConsultarLinhaDoTempoDto,
  ): Promise<ResultadoLinhaDoTempo> {
    const { tipos, de, ate, dataInicial, dataFinal, fuso, fusoHorario, ...pagina } = consulta;
    const deData = dataInicial ?? de;
    const ateData = dataFinal ?? ate;
    const fusoReal = fusoHorario ?? fuso;

    return this.consultarLinhaDoTempo.executar({
      filtro: { titularId, tipos, de: deData, ate: ateData },
      fuso: fusoReal,
      ...pagina,
    });
  }

  @Auditar('linha-do-tempo.detalhe')
  @Get('itens/:tipo/:origemId')
  detalharItem(
    @TitularAutenticado() titularId: string,
    @Param('tipo') tipo: string,
    @Param('origemId') origemId: string,
  ): EncaminhamentoDetalhe {
    return this.consultarDetalheItem.executar({
      id: origemId,
      origemId,
      tipo: normalizarTipoDeItem(tipo),
      titularId,
    });
  }
}
