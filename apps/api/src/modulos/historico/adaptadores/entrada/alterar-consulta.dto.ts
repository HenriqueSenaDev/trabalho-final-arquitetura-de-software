import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PedidoDeLembreteDto } from './registrar-consulta.dto';

/** Valida só quando o campo veio; `null` não é aceito em campo obrigatório. */
const SeEnviado = () => ValidateIf((_objeto, valor) => valor !== undefined);

/**
 * Correção parcial da consulta. Campo ausente fica como está. Nos campos
 * opcionais, `null` apaga o valor; em `lembrete`, `null` cancela o aviso.
 */
export class AlterarConsultaDto {
  @SeEnviado()
  @Type(() => Date)
  @IsDate()
  dataHora?: Date;

  @SeEnviado()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  especialidade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  profissional?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  local?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  anotacoes?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  retornoEm?: Date | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PedidoDeLembreteDto)
  lembrete?: PedidoDeLembreteDto | null;
}
