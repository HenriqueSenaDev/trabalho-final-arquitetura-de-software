import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PedidoDeLembreteDto {
  /** Quantos minutos antes da consulta o aviso deve sair (5 min a 7 dias). */
  @IsInt()
  @Min(5)
  @Max(7 * 24 * 60)
  antecedenciaMinutos!: number;
}

/**
 * Formato da requisição. Valida tipos e tamanhos; as regras de negócio
 * (retorno posterior, aviso no futuro) ficam no domínio. Não existe campo de
 * titular: ele vem da sessão.
 */
export class RegistrarConsultaDto {
  /**
   * Identificador gerado pelo aplicativo. Repetir o pedido com o mesmo id
   * devolve a consulta já registrada, sem duplicar.
   */
  @IsOptional()
  @IsUUID()
  id?: string;

  @Type(() => Date)
  @IsDate()
  dataHora!: Date;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  especialidade!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  profissional?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  local?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  anotacoes?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  retornoEm?: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => PedidoDeLembreteDto)
  lembrete?: PedidoDeLembreteDto;
}
