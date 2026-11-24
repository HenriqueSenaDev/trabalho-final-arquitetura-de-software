import { Body, Controller, Delete, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { TitularAutenticado } from '../../../../entrada-http/guarda-de-sessao';
import { CancelarLembrete, ConfigurarLembrete } from '../../aplicacao/casos-de-uso';
import { ConfigurarLembreteDto } from './dtos';

@Controller('lembretes')
export class LembretesController {
  constructor(
    private readonly configurar: ConfigurarLembrete,
    private readonly cancelar: CancelarLembrete,
  ) {}

  @Post() criar(@Body() corpo: ConfigurarLembreteDto, @TitularAutenticado() titularId: string) {
    return this.configurar.executar(corpo, titularId);
  }

  @Delete(':id') excluir(
    @Param('id', ParseUUIDPipe) id: string,
    @TitularAutenticado() titularId: string,
  ) {
    return this.cancelar.executar(id, titularId);
  }
}
