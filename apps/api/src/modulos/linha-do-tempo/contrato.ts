import {
  ResultadoLinhaDoTempo,
} from './aplicacao/consultar-linha-do-tempo';
import {
  FiltrosLinhaDoTempo,
  ItemLinhaDoTempo,
  TipoDeItem,
} from './portas/leitura-linha-do-tempo';

export {
  FiltrosLinhaDoTempo,
  ItemLinhaDoTempo,
  ResultadoLinhaDoTempo,
  TipoDeItem,
};

/**
 * Contrato público do módulo Linha do Tempo.
 * Disponibiliza a visão consolidada e cronológica dos registros pessoais de saúde (ADR 02).
 */
export abstract class ContratoLinhaDoTempo {
  abstract consultar(
    filtros: FiltrosLinhaDoTempo,
    titularId: string,
  ): Promise<ResultadoLinhaDoTempo>;
}
