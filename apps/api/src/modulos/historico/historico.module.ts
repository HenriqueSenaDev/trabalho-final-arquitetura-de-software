import { Module } from '@nestjs/common';
import { PublicadorEventos } from '@personal-health/contracts';
import { Relogio } from '../../compartilhado/portas/relogio';
import { UnidadeDeTrabalho } from '../../compartilhado/portas/unidade-de-trabalho';
import { ContratoLembretes } from '../lembretes/contrato';
import { LembretesModule } from '../lembretes/lembretes.module';
import { AdicionarAnexo } from './aplicacao/adicionar-anexo';
import { AlterarExame } from './aplicacao/alterar-exame';
import { ConsultarExame } from './aplicacao/consultar-exame';
import { ConsultarTratamento } from './aplicacao/consultar-tratamento';
import { EncerrarTratamento } from './aplicacao/encerrar-tratamento';
import { ExcluirExame } from './aplicacao/excluir-exame';
import { ListarExames } from './aplicacao/listar-exames';
import { ListarTratamentos } from './aplicacao/listar-tratamentos';
import { RecuperarAnexo } from './aplicacao/recuperar-anexo';
import { RegistrarExame } from './aplicacao/registrar-exame';
import { RemoverAnexo } from './aplicacao/remover-anexo';
import { SaveTreatmentUseCase } from './aplicacao/salvar-tratamento';
import { AnexosController } from './adaptadores/entrada/anexos.controller';
import { ConsultasController } from './adaptadores/entrada/consultas.controller';
import { ExamesController } from './adaptadores/entrada/exames.controller';
import { TratamentosController } from './adaptadores/entrada/tratamentos.controller';
import { PrismaRepositorioExames } from './adaptadores/saida/prisma-repositorio-exames';
import { PrismaRepositorioConsultas } from './adaptadores/saida/prisma-repositorio-consultas';
import { PrismaRepositorioTratamentos } from './adaptadores/saida/prisma-repositorio-tratamentos';
import { PublicadorEventosAdapter } from './adaptadores/saida/publicador-eventos-adapter';
import { StorageAnexosAdapter } from './adaptadores/saida/storage-anexos-adapter';
import { ValidadorArquivoAdapter } from './adaptadores/saida/validador-arquivo-adapter';
import { AlterarConsulta } from './aplicacao/alterar-consulta';
import { DetalharConsulta } from './aplicacao/detalhar-consulta';
import { ExcluirConsulta } from './aplicacao/excluir-consulta';
import { RegistrarConsulta } from './aplicacao/registrar-consulta';
import { ArmazenamentoAnexos } from './portas/armazenamento-anexos';
import { RepositorioExames } from './portas/repositorio-exames';
import { RepositorioConsultas } from './portas/repositorio-consultas';
import { RepositorioTratamentos } from './portas/repositorio-tratamentos';
import { ValidadorArquivo } from './portas/validador-arquivo';

const DEPENDENCIAS_DE_ESCRITA = [RepositorioConsultas, ContratoLembretes, UnidadeDeTrabalho, Relogio];
const DEPENDENCIAS_DE_EXAME = [RepositorioExames, UnidadeDeTrabalho];
const DEPENDENCIAS_DE_TRATAMENTO = [RepositorioTratamentos, UnidadeDeTrabalho, PublicadorEventos];

/**
 * Composição do Histórico. Dependências de outros módulos são contratos
 * públicos; os recursos secundários usam adaptadores explícitos indisponíveis.
 */
@Module({
  imports: [LembretesModule],
  controllers: [ConsultasController, ExamesController, AnexosController, TratamentosController],
  providers: [
    { provide: RepositorioConsultas, useClass: PrismaRepositorioConsultas },
    { provide: RepositorioExames, useClass: PrismaRepositorioExames },
    { provide: RepositorioTratamentos, useClass: PrismaRepositorioTratamentos },
    { provide: ArmazenamentoAnexos, useClass: StorageAnexosAdapter },
    { provide: ValidadorArquivo, useClass: ValidadorArquivoAdapter },
    { provide: PublicadorEventos, useClass: PublicadorEventosAdapter },
    {
      provide: RegistrarConsulta,
      inject: DEPENDENCIAS_DE_ESCRITA,
      useFactory: (
        consultas: RepositorioConsultas,
        lembretes: ContratoLembretes,
        unidadeDeTrabalho: UnidadeDeTrabalho,
        relogio: Relogio,
      ) => new RegistrarConsulta(consultas, lembretes, unidadeDeTrabalho, relogio),
    },
    {
      provide: AlterarConsulta,
      inject: DEPENDENCIAS_DE_ESCRITA,
      useFactory: (
        consultas: RepositorioConsultas,
        lembretes: ContratoLembretes,
        unidadeDeTrabalho: UnidadeDeTrabalho,
        relogio: Relogio,
      ) => new AlterarConsulta(consultas, lembretes, unidadeDeTrabalho, relogio),
    },
    {
      provide: ExcluirConsulta,
      inject: [RepositorioConsultas, ContratoLembretes, UnidadeDeTrabalho],
      useFactory: (
        consultas: RepositorioConsultas,
        lembretes: ContratoLembretes,
        unidadeDeTrabalho: UnidadeDeTrabalho,
      ) => new ExcluirConsulta(consultas, lembretes, unidadeDeTrabalho),
    },
    {
      provide: DetalharConsulta,
      inject: [RepositorioConsultas, ContratoLembretes],
      useFactory: (consultas: RepositorioConsultas, lembretes: ContratoLembretes) =>
        new DetalharConsulta(consultas, lembretes),
    },
    {
      provide: RegistrarExame,
      inject: DEPENDENCIAS_DE_EXAME,
      useFactory: (exames: RepositorioExames, unidade: UnidadeDeTrabalho) =>
        new RegistrarExame(exames, unidade),
    },
    {
      provide: AlterarExame,
      inject: [RepositorioExames],
      useFactory: (exames: RepositorioExames) => new AlterarExame(exames),
    },
    {
      provide: ConsultarExame,
      inject: [RepositorioExames],
      useFactory: (exames: RepositorioExames) => new ConsultarExame(exames),
    },
    {
      provide: ListarExames,
      inject: [RepositorioExames],
      useFactory: (exames: RepositorioExames) => new ListarExames(exames),
    },
    {
      provide: ExcluirExame,
      inject: [RepositorioExames, ArmazenamentoAnexos],
      useFactory: (exames: RepositorioExames, armazenamento: ArmazenamentoAnexos) =>
        new ExcluirExame(exames, armazenamento),
    },
    {
      provide: AdicionarAnexo,
      inject: [RepositorioExames, ArmazenamentoAnexos, ValidadorArquivo],
      useFactory: (
        exames: RepositorioExames,
        armazenamento: ArmazenamentoAnexos,
        validador: ValidadorArquivo,
      ) => new AdicionarAnexo(exames, armazenamento, validador),
    },
    {
      provide: RecuperarAnexo,
      inject: [RepositorioExames, ArmazenamentoAnexos],
      useFactory: (exames: RepositorioExames, armazenamento: ArmazenamentoAnexos) =>
        new RecuperarAnexo(exames, armazenamento),
    },
    {
      provide: RemoverAnexo,
      inject: [RepositorioExames, ArmazenamentoAnexos],
      useFactory: (exames: RepositorioExames, armazenamento: ArmazenamentoAnexos) =>
        new RemoverAnexo(exames, armazenamento),
    },
    {
      provide: SaveTreatmentUseCase,
      inject: DEPENDENCIAS_DE_TRATAMENTO,
      useFactory: (
        tratamentos: RepositorioTratamentos,
        unidade: UnidadeDeTrabalho,
        publicador: PublicadorEventos,
      ) => new SaveTreatmentUseCase(tratamentos, unidade, publicador),
    },
    {
      provide: ConsultarTratamento,
      inject: [RepositorioTratamentos],
      useFactory: (tratamentos: RepositorioTratamentos) => new ConsultarTratamento(tratamentos),
    },
    {
      provide: ListarTratamentos,
      inject: [RepositorioTratamentos],
      useFactory: (tratamentos: RepositorioTratamentos) => new ListarTratamentos(tratamentos),
    },
    {
      provide: EncerrarTratamento,
      inject: DEPENDENCIAS_DE_TRATAMENTO,
      useFactory: (
        tratamentos: RepositorioTratamentos,
        unidade: UnidadeDeTrabalho,
        publicador: PublicadorEventos,
      ) => new EncerrarTratamento(tratamentos, unidade, publicador),
    },
  ],
})
export class HistoricoModule {}
