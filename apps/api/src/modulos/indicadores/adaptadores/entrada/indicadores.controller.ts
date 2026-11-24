import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auditar } from '../../../../entrada-http/auditoria.interceptor';
import { TitularAutenticado } from '../../../../entrada-http/guarda-de-sessao';
import { AlterarMedicao } from '../../aplicacao/alterar-medicao';
import { ConsultarEvolucaoIndicadores } from '../../aplicacao/consultar-evolucao-indicadores';
import { ConsultarMedicoes } from '../../aplicacao/consultar-medicoes';
import { ExcluirMedicao } from '../../aplicacao/excluir-medicao';
import { RegistrarMedicao } from '../../aplicacao/registrar-medicao';
import { AlterarMedicaoDto } from './alterar-medicao.dto';
import { ConsultarEvolucaoDto } from './consultar-evolucao.dto';
import { ConsultarMedicoesDto } from './consultar-medicoes.dto';
import { RegistrarMedicaoDto } from './registrar-medicao.dto';

/**
 * Adaptador de entrada HTTP do componente Indicadores (C3).
 * Responsável pelo registro, gerenciamento e consulta de medições de saúde (ADR 01 e 04).
 */
@Controller('indicadores')
export class IndicadoresController {
  constructor(
    private readonly registrarMedicao: RegistrarMedicao,
    private readonly alterarMedicao: AlterarMedicao,
    private readonly excluirMedicao: ExcluirMedicao,
    private readonly consultarMedicoes: ConsultarMedicoes,
    private readonly consultarEvolucaoIndicadores: ConsultarEvolucaoIndicadores,
  ) {}

  @Auditar('indicadores.registrar')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async registrar(
    @TitularAutenticado() titularId: string,
    @Body() dto: RegistrarMedicaoDto,
  ) {
    const valor = dto.converterParaValorMedicao();
    const medicao = await this.registrarMedicao.executar(
      {
        id: dto.id,
        tipo: dto.tipo,
        valor,
        dataHora: dto.dataHora,
      },
      titularId,
    );

    return medicao.paraLeitura();
  }

  @Auditar('indicadores.alterar')
  @Patch(':id')
  async alterar(
    @TitularAutenticado() titularId: string,
    @Param('id') id: string,
    @Body() dto: AlterarMedicaoDto,
  ) {
    // Para alteração, o tipo é recuperado e validado no caso de uso
    const medicaoAtualizada = await this.alterarMedicao.executar(
      id,
      {
        dataHora: dto.dataHora,
      },
      titularId,
    );

    return medicaoAtualizada.paraLeitura();
  }

  @Auditar('indicadores.excluir')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async excluir(
    @TitularAutenticado() titularId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.excluirMedicao.executar(id, titularId);
  }

  @Auditar('indicadores.consultar')
  @Get()
  async consultar(
    @TitularAutenticado() titularId: string,
    @Query() dto: ConsultarMedicoesDto,
  ) {
    const medicoes = await this.consultarMedicoes.executar(
      {
        tipo: dto.tipo,
        de: dto.de,
        ate: dto.ate,
      },
      titularId,
    );

    return medicoes.map((m) => m.paraLeitura());
  }

  @Auditar('indicadores.evolucao')
  @Get('evolucao')
  async evolucao(
    @TitularAutenticado() titularId: string,
    @Query() dto: ConsultarEvolucaoDto,
  ) {
    return this.consultarEvolucaoIndicadores.executar(
      dto.tipo,
      {
        de: dto.de,
        ate: dto.ate,
      },
      titularId,
    );
  }
}
