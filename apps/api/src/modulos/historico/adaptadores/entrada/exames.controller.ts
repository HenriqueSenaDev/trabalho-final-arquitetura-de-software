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
import { AlterarExame } from '../../aplicacao/alterar-exame';
import { ConsultarExame } from '../../aplicacao/consultar-exame';
import { ExcluirExame } from '../../aplicacao/excluir-exame';
import { ListarExames } from '../../aplicacao/listar-exames';
import { RegistrarExame } from '../../aplicacao/registrar-exame';
import { AlterarExameDto } from './alterar-exame.dto';
import { RegistrarExameDto } from './registrar-exame.dto';

@Controller('exames')
export class ExamesController {
  constructor(
    private readonly registrarExame: RegistrarExame,
    private readonly alterarExame: AlterarExame,
    private readonly consultarExame: ConsultarExame,
    private readonly excluirExame: ExcluirExame,
    private readonly listarExames: ListarExames,
  ) {}

  @Auditar('exame.listar')
  @Get()
  listar(@TitularAutenticado() titularId: string) {
    return this.listarExames.executar(titularId);
  }

  @Auditar('exame.registrar')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  registrar(@TitularAutenticado() titularId: string, @Body() dto: RegistrarExameDto) {
    return this.registrarExame.executar(dto, titularId);
  }

  @Auditar('exame.consultar')
  @Get(':exameId')
  consultar(
    @TitularAutenticado() titularId: string,
    @Param('exameId', ParseUUIDPipe) exameId: string,
  ) {
    return this.consultarExame.executar(exameId, titularId);
  }

  @Auditar('exame.alterar')
  @Patch(':exameId')
  @HttpCode(HttpStatus.OK)
  alterar(
    @TitularAutenticado() titularId: string,
    @Param('exameId', ParseUUIDPipe) exameId: string,
    @Body() dto: AlterarExameDto,
  ) {
    return this.alterarExame.executar(exameId, dto, titularId);
  }

  @Auditar('exame.excluir')
  @Delete(':exameId')
  @HttpCode(HttpStatus.NO_CONTENT)
  excluir(
    @TitularAutenticado() titularId: string,
    @Param('exameId', ParseUUIDPipe) exameId: string,
  ) {
    return this.excluirExame.executar(exameId, titularId);
  }
}
