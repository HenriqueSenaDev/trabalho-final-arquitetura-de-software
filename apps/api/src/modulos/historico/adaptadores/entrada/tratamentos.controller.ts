import {
  Body,
  Controller,
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
import { ConsultarTratamento } from '../../aplicacao/consultar-tratamento';
import { EncerrarTratamento } from '../../aplicacao/encerrar-tratamento';
import { ListarTratamentos } from '../../aplicacao/listar-tratamentos';
import { SaveTreatmentUseCase } from '../../aplicacao/salvar-tratamento';
import { FrequenciaTratamento } from '../../dominio/frequencia-tratamento';
import { SalvarTratamentoDto } from './salvar-tratamento.dto';

@Controller('tratamentos')
export class TratamentosController {
  constructor(
    private readonly salvarTratamento: SaveTreatmentUseCase,
    private readonly consultarTratamento: ConsultarTratamento,
    private readonly encerrarTratamento: EncerrarTratamento,
    private readonly listarTratamentos: ListarTratamentos,
  ) {}

  @Auditar('tratamento.listar')
  @Get()
  listar(@TitularAutenticado() titularId: string) {
    return this.listarTratamentos.executar(titularId);
  }

  @Auditar('tratamento.registrar')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  registrar(@TitularAutenticado() titularId: string, @Body() dto: SalvarTratamentoDto) {
    return this.salvarTratamento.executar(
      {
        medicamento: dto.medicamento,
        dose: dto.dose,
        formaAdministracao: dto.formaAdministracao,
        frequencia: converterFrequencia(dto),
        dataInicio: dto.dataInicio,
        dataFim: dto.dataFim,
        horarioInicial: dto.horarioInicial ?? null,
      },
      titularId,
    );
  }

  @Auditar('tratamento.consultar')
  @Get(':tratamentoId')
  consultar(
    @TitularAutenticado() titularId: string,
    @Param('tratamentoId', ParseUUIDPipe) tratamentoId: string,
  ) {
    return this.consultarTratamento.executar(tratamentoId, titularId);
  }

  @Auditar('tratamento.alterar')
  @Patch(':tratamentoId')
  @HttpCode(HttpStatus.OK)
  alterar(
    @TitularAutenticado() titularId: string,
    @Param('tratamentoId', ParseUUIDPipe) tratamentoId: string,
    @Body() dto: SalvarTratamentoDto,
  ) {
    return this.salvarTratamento.alterar(
      tratamentoId,
      {
        medicamento: dto.medicamento,
        dose: dto.dose,
        formaAdministracao: dto.formaAdministracao,
        frequencia: converterFrequencia(dto),
        dataInicio: dto.dataInicio,
        dataFim: dto.dataFim,
        horarioInicial: dto.horarioInicial ?? null,
      },
      titularId,
    );
  }

  @Auditar('tratamento.encerrar')
  @Post(':tratamentoId/encerrar')
  @HttpCode(HttpStatus.OK)
  encerrar(
    @TitularAutenticado() titularId: string,
    @Param('tratamentoId', ParseUUIDPipe) tratamentoId: string,
  ) {
    return this.encerrarTratamento.executar(tratamentoId, titularId);
  }
}

function converterFrequencia(dto: SalvarTratamentoDto): FrequenciaTratamento {
  return dto.frequencia.tipo === 'FIXA'
    ? FrequenciaTratamento.fixa(dto.frequencia.intervaloHoras ?? 0)
    : FrequenciaTratamento.sobDemanda();
}
