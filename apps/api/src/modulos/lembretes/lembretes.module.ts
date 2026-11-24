import { Module } from '@nestjs/common';
import { Relogio } from '../../compartilhado/portas/relogio';
import { PrismaRepositorioAgendamentos } from './adaptadores/saida/prisma-repositorio-agendamentos';
import { AvisosDeConsulta } from './aplicacao/avisos-de-consulta';
import { ContratoLembretes } from './contrato';
import { RepositorioAgendamentos } from './portas/repositorio-agendamentos';
import { OcorrenciasController } from './adaptadores/entrada/ocorrencias.controller';
import { RepositorioOcorrencias } from './portas/repositorio-ocorrencias';
import { LembretesController } from './adaptadores/entrada/lembretes.controller';
import {
  PrismaRepositorioLembretes,
  PrismaRepositorioOcorrencias,
  PrismaRepositorioRespostasDose,
} from './adaptadores/saida/prisma-repositorios-secundarios';
import {
  PrismaRepositorioOutbox,
  PublicadorEventosOutbox,
} from './adaptadores/saida/prisma-repositorio-outbox';
import {
  CancelarLembrete,
  ConfigurarLembrete,
  ConsultarOcorrencias,
  RegistrarRespostaDose,
} from './aplicacao/casos-de-uso';
import { RepositorioLembretes } from './portas/repositorio-lembretes';
import { RepositorioRespostasDose } from './portas/repositorio-respostas-dose';
import { PublicadorEventos, RepositorioOutbox } from './portas/eventos';
import { UnidadeDeTrabalho } from '../../compartilhado/portas/unidade-de-trabalho';

@Module({
  controllers: [OcorrenciasController, LembretesController],
  providers: [
    { provide: RepositorioLembretes, useClass: PrismaRepositorioLembretes },
    { provide: RepositorioOcorrencias, useClass: PrismaRepositorioOcorrencias },
    { provide: RepositorioRespostasDose, useClass: PrismaRepositorioRespostasDose },
    { provide: RepositorioOutbox, useClass: PrismaRepositorioOutbox },
    {
      provide: PublicadorEventos,
      inject: [RepositorioOutbox],
      useFactory: (repo: RepositorioOutbox) => new PublicadorEventosOutbox(repo),
    },
    {
      provide: ConfigurarLembrete,
      inject: [RepositorioLembretes, UnidadeDeTrabalho, PublicadorEventos],
      useFactory: (
        repo: RepositorioLembretes,
        unidade: UnidadeDeTrabalho,
        eventos: PublicadorEventos,
      ) => new ConfigurarLembrete(repo, unidade, eventos),
    },
    {
      provide: CancelarLembrete,
      inject: [RepositorioLembretes, UnidadeDeTrabalho, PublicadorEventos],
      useFactory: (
        repo: RepositorioLembretes,
        unidade: UnidadeDeTrabalho,
        eventos: PublicadorEventos,
      ) => new CancelarLembrete(repo, unidade, eventos),
    },
    {
      provide: RegistrarRespostaDose,
      inject: [RepositorioOcorrencias, RepositorioRespostasDose],
      useFactory: (ocorrencias: RepositorioOcorrencias, respostas: RepositorioRespostasDose) =>
        new RegistrarRespostaDose(ocorrencias, respostas),
    },
    {
      provide: ConsultarOcorrencias,
      inject: [RepositorioOcorrencias],
      useFactory: (repo: RepositorioOcorrencias) => new ConsultarOcorrencias(repo),
    },
    { provide: RepositorioAgendamentos, useClass: PrismaRepositorioAgendamentos },
    {
      provide: ContratoLembretes,
      inject: [RepositorioAgendamentos, Relogio],
      useFactory: (agendamentos: RepositorioAgendamentos, relogio: Relogio) =>
        new AvisosDeConsulta(agendamentos, relogio),
    },
  ],
  exports: [ContratoLembretes],
})
export class LembretesModule {}
