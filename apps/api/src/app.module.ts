import { Module } from '@nestjs/common';
import { CompartilhadoModule } from './compartilhado/compartilhado.module';
import { EntradaHttpModule } from './entrada-http/entrada-http.module';
import { AcessoContaModule } from './modulos/acesso-conta/acesso-conta.module';
import { HistoricoModule } from './modulos/historico/historico.module';
import { LembretesModule } from './modulos/lembretes/lembretes.module';
import { LinhaDoTempoModule } from './modulos/linha-do-tempo/linha-do-tempo.module';

/**
 * API de Saúde: monólito modular (ADR 01). Cada módulo do C3 é um módulo
 * Nest com domínio, aplicação, portas e adaptadores próprios.
 */
@Module({
  imports: [
    CompartilhadoModule,
    EntradaHttpModule,
    AcessoContaModule,
    HistoricoModule,
    LembretesModule,
    LinhaDoTempoModule,
  ],
})
export class AppModule {}
