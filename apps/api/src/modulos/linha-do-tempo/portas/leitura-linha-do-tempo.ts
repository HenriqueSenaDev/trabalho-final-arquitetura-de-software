/**
 * Tipos de origem dos registros que compõem a Linha do Tempo (ADR 02).
 * Inclui consultas e retornos (Histórico), exames e tratamentos (acordados com Histórico/Gabi),
 * e medições de saúde (Indicadores).
 */
export const TIPOS_DE_ORIGEM = [
  'CONSULTA',
  'RETORNO',
  'EXAME',
  'INICIO_TRATAMENTO',
  'FIM_TRATAMENTO',
  'MEDICAO',
] as const;

export const TIPOS_DE_ITEM = TIPOS_DE_ORIGEM;
export type TipoDeItem = (typeof TIPOS_DE_ITEM)[number];
export type TipoOrigemItem = TipoDeItem;

export function normalizarTipoDeItem(tipo: string): TipoDeItem {
  const mapeamento: Record<string, TipoDeItem> = {
    CONSULTA: 'CONSULTA',
    Consulta: 'CONSULTA',
    RETORNO: 'RETORNO',
    Retorno: 'RETORNO',
    EXAME: 'EXAME',
    Exame: 'EXAME',
    INICIO_TRATAMENTO: 'INICIO_TRATAMENTO',
    InicioTratamento: 'INICIO_TRATAMENTO',
    FIM_TRATAMENTO: 'FIM_TRATAMENTO',
    FimTratamento: 'FIM_TRATAMENTO',
    MEDICAO: 'MEDICAO',
    Medicao: 'MEDICAO',
  };
  return mapeamento[tipo] ?? (tipo.toUpperCase() as TipoDeItem);
}

/**
 * Item projetado a partir dos registros vigentes (ADR 02).
 * Não representa uma entidade persistida independente.
 */
export interface ItemDaLinhaDoTempo {
  id: string;
  tipo: TipoDeItem;
  data: Date;
  titulo: string;
  detalhe: string | null;
  origemId?: string;
  dataHora?: Date;
  resumo?: string | null;
}

export interface ItemLinhaDoTempo extends ItemDaLinhaDoTempo {
  origemId: string;
  dataHora: Date;
  resumo: string | null;
}

export interface FiltroLinhaDoTempo {
  titularId: string;
  tipos?: TipoDeItem[];
  de?: Date;
  ate?: Date;
  dataInicial?: Date;
  dataFinal?: Date;
}

export interface FiltrosLinhaDoTempo {
  tipos?: TipoDeItem[];
  dataInicial?: Date;
  dataFinal?: Date;
  limite?: number;
  cursor?: string;
  fusoHorario?: string;
  // Campos legados mantidos para compatibilidade
  de?: Date;
  ate?: Date;
  fuso?: string;
}

/** Posição para paginação por chave: data, tipo e identificador como desempate. */
export interface PosicaoNaLinhaDoTempo {
  data: Date;
  tipo: TipoDeItem;
  id: string;
}

export type CursorLinhaDoTempo = PosicaoNaLinhaDoTempo;

/**
 * Porta de leitura da Linha do Tempo (ADR 02). Consulta os registros
 * vigentes no momento da leitura, então um registro confirmado aparece na
 * próxima consulta. Representa a leitura consolidada dos registros
 * persistidos pelos módulos de Histórico e Indicadores.
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
