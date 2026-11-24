export const TIPOS_DE_ITEM = ['CONSULTA', 'RETORNO'] as const;
export type TipoDeItem = (typeof TIPOS_DE_ITEM)[number];

/** Item projetado a partir dos registros vigentes. `id` é o do registro de origem. */
export interface ItemDaLinhaDoTempo {
  tipo: TipoDeItem;
  id: string;
  data: Date;
  titulo: string;
  detalhe: string | null;
}

export interface FiltroLinhaDoTempo {
  titularId: string;
  tipos?: TipoDeItem[];
  de?: Date;
  ate?: Date;
}

/** Posição para paginação por chave: data, tipo e identificador como desempate. */
export interface PosicaoNaLinhaDoTempo {
  data: Date;
  tipo: TipoDeItem;
  id: string;
}

/**
 * Porta de leitura da Linha do Tempo (ADR 02). Consulta os registros
 * vigentes no momento da leitura, então um registro confirmado aparece na
 * próxima consulta. Se o custo de leitura crescer, um adaptador com projeção
 * assíncrona pode substituir o atual sem mudar esta porta.
 */
export abstract class LeituraLinhaDoTempo {
  /** Acontecimentos depois de `agora`, do mais próximo para o mais distante. */
  abstract proximos(
    filtro: FiltroLinhaDoTempo,
    agora: Date,
    limite: number,
  ): Promise<ItemDaLinhaDoTempo[]>;

  /** Acontecimentos até `agora`, do mais recente para o mais antigo. */
  abstract passados(
    filtro: FiltroLinhaDoTempo,
    agora: Date,
    depoisDe: PosicaoNaLinhaDoTempo | null,
    limite: number,
  ): Promise<ItemDaLinhaDoTempo[]>;
}
