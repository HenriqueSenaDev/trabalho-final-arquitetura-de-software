import { Module } from '@nestjs/common';
import { Relogio } from '../../compartilhado/portas/relogio';
import { PrismaRepositorioAgendamentos } from './adaptadores/saida/prisma-repositorio-agendamentos';
import { AvisosDeConsulta } from './aplicacao/avisos-de-consulta';
import { ContratoLembretes } from './contrato';
import { RepositorioAgendamentos } from './portas/repositorio-agendamentos';

/**
 * O módulo não tem rota HTTP própria: agendar, reagendar e cancelar avisos de
 * consulta acontecem pelo contrato, acionado pelo Histórico na mesma
 * transação da consulta. A entrega dos avisos roda fora da API, em apps/worker.
 */
@Module({
  providers: [
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
