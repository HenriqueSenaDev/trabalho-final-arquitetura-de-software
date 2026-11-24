import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Auditar } from '../../../../entrada-http/auditoria.interceptor';
import { Publico, SessaoAutenticada } from '../../../../entrada-http/guarda-de-sessao';
import { IdentidadeAutenticada } from '../../contrato';
import { IniciarSessao, SessaoIniciada } from '../../aplicacao/iniciar-sessao';
import { ListarSessoes, RevogarSessao, SessaoAtiva } from '../../aplicacao/sessoes-do-titular';

export class IniciarSessaoDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  senha!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  dispositivo?: string;

  /** Token do aparelho no provedor de notificações. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tokenEntrega?: string;
}

/** Adaptador de entrada HTTP do módulo Acesso à Conta. */
@Controller('sessoes')
export class SessoesController {
  constructor(
    private readonly iniciarSessao: IniciarSessao,
    private readonly listarSessoes: ListarSessoes,
    private readonly revogarSessao: RevogarSessao,
  ) {}

  @Publico()
  @Auditar('sessao.iniciar')
  @Post()
  iniciar(@Body() corpo: IniciarSessaoDto): Promise<SessaoIniciada> {
    return this.iniciarSessao.executar(corpo);
  }

  @Auditar('sessao.listar')
  @Get()
  listar(@SessaoAutenticada() identidade: IdentidadeAutenticada): Promise<SessaoAtiva[]> {
    return this.listarSessoes.executar(identidade);
  }

  /** A própria sessão (sair) ou a de outro aparelho do mesmo titular. */
  @Auditar('sessao.revogar')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revogar(
    @SessaoAutenticada() identidade: IdentidadeAutenticada,
    @Param('id', ParseUUIDPipe) sessaoId: string,
  ): Promise<void> {
    return this.revogarSessao.executar({ titularId: identidade.titularId, sessaoId });
  }
}
