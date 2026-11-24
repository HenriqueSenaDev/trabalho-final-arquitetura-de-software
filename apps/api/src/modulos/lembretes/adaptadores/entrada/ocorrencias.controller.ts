import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { TitularAutenticado } from '../../../../entrada-http/guarda-de-sessao';
import { ConsultarOcorrencias, RegistrarRespostaDose } from '../../aplicacao/casos-de-uso';
import { RespostaDoseDto } from './dtos';

@Controller('ocorrencias-de-dose')
export class OcorrenciasController {
  constructor(
    private readonly registrar: RegistrarRespostaDose,
    private readonly consultar: ConsultarOcorrencias,
  ) {}

  @Post(':id/resposta') responder(
    @TitularAutenticado() titularId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corpo: RespostaDoseDto,
  ) {
    return this.registrar.executar(id, corpo.resposta, titularId);
  }

  @Get() listar(
    @TitularAutenticado() titularId: string,
    @Query('tratamentoId') tratamentoId?: string,
  ) {
    return this.consultar.executar({ tratamentoId }, titularId);
  }
}
