import { Module } from '@nestjs/common';
import { Relogio } from '../../compartilhado/portas/relogio';
import { SessoesController } from './adaptadores/entrada/sessoes.controller';
import { PrismaRepositorioSessoes } from './adaptadores/saida/prisma-repositorio-sessoes';
import { PrismaRepositorioTitulares } from './adaptadores/saida/prisma-repositorio-titulares';
import { ScryptVerificadorDeSenha } from './adaptadores/saida/scrypt-verificador-de-senha';
import { IniciarSessao } from './aplicacao/iniciar-sessao';
import { ListarSessoes, RevogarSessao } from './aplicacao/sessoes-do-titular';
import { ValidarSessao } from './aplicacao/validar-sessao';
import { ContratoAcessoConta } from './contrato';
import { RepositorioSessoes } from './portas/repositorio-sessoes';
import { RepositorioTitulares } from './portas/repositorio-titulares';
import { VerificadorDeSenha } from './portas/verificador-de-senha';

/** Composição do módulo: liga cada porta ao seu adaptador. */
@Module({
  controllers: [SessoesController],
  providers: [
    { provide: RepositorioTitulares, useClass: PrismaRepositorioTitulares },
    { provide: RepositorioSessoes, useClass: PrismaRepositorioSessoes },
    { provide: VerificadorDeSenha, useClass: ScryptVerificadorDeSenha },
    {
      provide: IniciarSessao,
      inject: [RepositorioTitulares, RepositorioSessoes, VerificadorDeSenha, Relogio],
      useFactory: (
        titulares: RepositorioTitulares,
        sessoes: RepositorioSessoes,
        senhas: VerificadorDeSenha,
        relogio: Relogio,
      ) => new IniciarSessao(titulares, sessoes, senhas, relogio),
    },
    {
      provide: ListarSessoes,
      inject: [RepositorioSessoes],
      useFactory: (sessoes: RepositorioSessoes) => new ListarSessoes(sessoes),
    },
    {
      provide: RevogarSessao,
      inject: [RepositorioSessoes, Relogio],
      useFactory: (sessoes: RepositorioSessoes, relogio: Relogio) =>
        new RevogarSessao(sessoes, relogio),
    },
    {
      provide: ContratoAcessoConta,
      inject: [RepositorioSessoes],
      useFactory: (sessoes: RepositorioSessoes) => new ValidarSessao(sessoes),
    },
  ],
  exports: [ContratoAcessoConta],
})
export class AcessoContaModule {}
