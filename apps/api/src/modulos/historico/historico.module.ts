import { Module } from '@nestjs/common';
import { Relogio } from '../../compartilhado/portas/relogio';
import { UnidadeDeTrabalho } from '../../compartilhado/portas/unidade-de-trabalho';
import { ContratoLembretes } from '../lembretes/contrato';
import { LembretesModule } from '../lembretes/lembretes.module';
import { ConsultasController } from './adaptadores/entrada/consultas.controller';
import { PrismaRepositorioConsultas } from './adaptadores/saida/prisma-repositorio-consultas';
import { AlterarConsulta } from './aplicacao/alterar-consulta';
import { DetalharConsulta } from './aplicacao/detalhar-consulta';
import { ExcluirConsulta } from './aplicacao/excluir-consulta';
import { RegistrarConsulta } from './aplicacao/registrar-consulta';
import { RepositorioConsultas } from './portas/repositorio-consultas';

const DEPENDENCIAS_DE_ESCRITA = [RepositorioConsultas, ContratoLembretes, UnidadeDeTrabalho, Relogio];

/**
 * Composição do Histórico. A única dependência de outro módulo é o contrato
 * de Lembretes, recebido por injeção.
 */
@Module({
  imports: [LembretesModule],
  controllers: [ConsultasController],
  providers: [
    { provide: RepositorioConsultas, useClass: PrismaRepositorioConsultas },
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
  ],
})
export class HistoricoModule {}
