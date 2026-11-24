import { Module } from '@nestjs/common';
import { Relogio } from '../../compartilhado/portas/relogio';
import { LinhaDoTempoController } from './adaptadores/entrada/linha-do-tempo.controller';
import { SqlLeituraLinhaDoTempo } from './adaptadores/saida/sql-leitura-linha-do-tempo';
import { ConsultarDetalheItem } from './aplicacao/consultar-detalhe-item';
import { ConsultarLinhaDoTempo } from './aplicacao/consultar-linha-do-tempo';
import { LeituraLinhaDoTempo } from './portas/leitura-linha-do-tempo';

@Module({
  controllers: [LinhaDoTempoController],
  providers: [
    { provide: LeituraLinhaDoTempo, useClass: SqlLeituraLinhaDoTempo },
    {
      provide: ConsultarLinhaDoTempo,
      inject: [LeituraLinhaDoTempo, Relogio],
      useFactory: (leitura: LeituraLinhaDoTempo, relogio: Relogio) =>
        new ConsultarLinhaDoTempo(leitura, relogio),
    },
    {
      provide: ConsultarDetalheItem,
      useClass: ConsultarDetalheItem,
    },
  ],
  exports: [LeituraLinhaDoTempo, ConsultarLinhaDoTempo, ConsultarDetalheItem],
})
export class LinhaDoTempoModule {}
