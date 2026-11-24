import { Module } from '@nestjs/common';
import { Relogio } from '../../compartilhado/portas/relogio';
import { IndicadoresController } from './adaptadores/entrada/indicadores.controller';
import { PrismaLeituraIndicadores } from './adaptadores/saida/prisma-leitura-indicadores';
import { PrismaRepositorioMedicoes } from './adaptadores/saida/prisma-repositorio-medicoes';
import { AlterarMedicao } from './aplicacao/alterar-medicao';
import { ConsultarEvolucaoIndicadores } from './aplicacao/consultar-evolucao-indicadores';
import { ConsultarMedicoes } from './aplicacao/consultar-medicoes';
import { ExcluirMedicao } from './aplicacao/excluir-medicao';
import { RegistrarMedicao } from './aplicacao/registrar-medicao';
import { LeituraIndicadores } from './portas/leitura-indicadores';
import { RepositorioMedicoes } from './portas/repositorio-medicoes';

/**
 * Módulo Indicadores (C3 e C4):
 * Composição e configuração da injeção de dependências para o componente de medições de saúde.
 */
@Module({
  controllers: [IndicadoresController],
  providers: [
    { provide: RepositorioMedicoes, useClass: PrismaRepositorioMedicoes },
    { provide: LeituraIndicadores, useClass: PrismaLeituraIndicadores },
    {
      provide: RegistrarMedicao,
      inject: [RepositorioMedicoes, Relogio],
      useFactory: (repositorio: RepositorioMedicoes, relogio: Relogio) =>
        new RegistrarMedicao(repositorio, relogio),
    },
    {
      provide: AlterarMedicao,
      inject: [RepositorioMedicoes, Relogio],
      useFactory: (repositorio: RepositorioMedicoes, relogio: Relogio) =>
        new AlterarMedicao(repositorio, relogio),
    },
    {
      provide: ExcluirMedicao,
      inject: [RepositorioMedicoes],
      useFactory: (repositorio: RepositorioMedicoes) =>
        new ExcluirMedicao(repositorio),
    },
    {
      provide: ConsultarMedicoes,
      inject: [RepositorioMedicoes],
      useFactory: (repositorio: RepositorioMedicoes) =>
        new ConsultarMedicoes(repositorio),
    },
    {
      provide: ConsultarEvolucaoIndicadores,
      inject: [LeituraIndicadores],
      useFactory: (leitura: LeituraIndicadores) =>
        new ConsultarEvolucaoIndicadores(leitura),
    },
  ],
  exports: [
    RepositorioMedicoes,
    LeituraIndicadores,
    RegistrarMedicao,
    AlterarMedicao,
    ExcluirMedicao,
    ConsultarMedicoes,
    ConsultarEvolucaoIndicadores,
  ],
})
export class IndicadoresModule {}
