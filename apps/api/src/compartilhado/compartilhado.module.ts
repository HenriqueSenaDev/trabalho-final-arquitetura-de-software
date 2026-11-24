import { Global, Module } from '@nestjs/common';
import { ContextoPrisma } from './adaptadores/contexto-prisma';
import { PrismaService } from './adaptadores/prisma.service';
import { PrismaTrilhaDeAuditoria } from './adaptadores/prisma-trilha-de-auditoria';
import { PrismaUnidadeDeTrabalho } from './adaptadores/prisma-unidade-de-trabalho';
import { RelogioDoSistema } from './adaptadores/relogio-do-sistema';
import { Relogio } from './portas/relogio';
import { TrilhaDeAuditoria } from './portas/trilha-de-auditoria';
import { UnidadeDeTrabalho } from './portas/unidade-de-trabalho';

/** Liga as portas compartilhadas aos seus adaptadores. */
@Global()
@Module({
  providers: [
    PrismaService,
    ContextoPrisma,
    { provide: UnidadeDeTrabalho, useClass: PrismaUnidadeDeTrabalho },
    { provide: Relogio, useClass: RelogioDoSistema },
    { provide: TrilhaDeAuditoria, useClass: PrismaTrilhaDeAuditoria },
  ],
  exports: [PrismaService, ContextoPrisma, UnidadeDeTrabalho, Relogio, TrilhaDeAuditoria],
})
export class CompartilhadoModule {}
