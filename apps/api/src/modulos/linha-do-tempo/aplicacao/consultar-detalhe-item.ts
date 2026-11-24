import { RegraVioladaErro } from '../../../compartilhado/dominio/erros';
import { TipoDeItem } from '../portas/leitura-linha-do-tempo';

export interface ParametrosDetalheItem {
  id: string;
  origemId: string;
  tipo: TipoDeItem;
  titularId: string;
}

export interface EncaminhamentoDetalhe {
  moduloProprietario: 'historico' | 'indicadores';
  rota: string;
  identificador: string;
}

/**
 * Caso de uso da Linha do Tempo: encaminha a consulta do detalhe de um item
 * ao módulo proprietário do registro original, sem duplicar regras de negócio
 * do Histórico ou de Indicadores (ADR 02).
 */
export class ConsultarDetalheItem {
  executar(parametros: ParametrosDetalheItem): EncaminhamentoDetalhe {
    if (!parametros.titularId) {
      throw new RegraVioladaErro('Titular não informado.');
    }

    switch (parametros.tipo) {
      case 'CONSULTA':
      case 'RETORNO':
        return {
          moduloProprietario: 'historico',
          rota: `/consultas/${parametros.origemId}`,
          identificador: parametros.origemId,
        };
      case 'MEDICAO':
        return {
          moduloProprietario: 'indicadores',
          rota: `/indicadores/${parametros.origemId}`,
          identificador: parametros.origemId,
        };
      case 'EXAME':
      case 'INICIO_TRATAMENTO':
      case 'FIM_TRATAMENTO':
        return {
          moduloProprietario: 'historico',
          rota: `/historico/registros/${parametros.origemId}`,
          identificador: parametros.origemId,
        };
      default:
        throw new RegraVioladaErro(`Tipo de registro desconhecido: ${parametros.tipo}`);
    }
  }
}
