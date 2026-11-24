import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Auditar } from '../../../../entrada-http/auditoria.interceptor';
import { TitularAutenticado } from '../../../../entrada-http/guarda-de-sessao';
import { AlterarConsulta, ConsultaAlterada } from '../../aplicacao/alterar-consulta';
import { DetalharConsulta, DetalheDaConsulta } from '../../aplicacao/detalhar-consulta';
import { ExcluirConsulta } from '../../aplicacao/excluir-consulta';
import { ConsultaRegistrada, RegistrarConsulta } from '../../aplicacao/registrar-consulta';
import { AlterarConsultaDto } from './alterar-consulta.dto';
import { RegistrarConsultaDto } from './registrar-consulta.dto';

/**
 * Adaptador de entrada HTTP do Histórico. Traduz a requisição em comando e
 * chama o caso de uso; não contém regra de negócio.
 */
@Controller('consultas')
export class ConsultasController {
  constructor(
    private readonly registrarConsulta: RegistrarConsulta,
    private readonly detalharConsulta: DetalharConsulta,
    private readonly alterarConsulta: AlterarConsulta,
    private readonly excluirConsulta: ExcluirConsulta,
  ) {}

  @Auditar('consulta.registrar')
  @Post()
  registrar(
    @TitularAutenticado() titularId: string,
    @Body() corpo: RegistrarConsultaDto,
  ): Promise<ConsultaRegistrada> {
    return this.registrarConsulta.executar({ ...corpo, titularId });
  }

  @Auditar('consulta.detalhar')
  @Get(':id')
  detalhar(
    @TitularAutenticado() titularId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DetalheDaConsulta> {
    return this.detalharConsulta.executar({ titularId, id });
  }

  @Auditar('consulta.alterar')
  @Patch(':id')
  alterar(
    @TitularAutenticado() titularId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: AlterarConsultaDto,
  ): Promise<ConsultaAlterada> {
    return this.alterarConsulta.executar({ ...corpo, titularId, id });
  }

  @Auditar('consulta.excluir')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  excluir(
    @TitularAutenticado() titularId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.excluirConsulta.executar({ titularId, id });
  }
}
