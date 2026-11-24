import { RegraVioladaErro } from '../../../compartilhado/dominio/erros';
import { Relogio } from '../../../compartilhado/portas/relogio';
import {
  CursorLinhaDoTempo,
  FiltroLinhaDoTempo,
  FiltrosLinhaDoTempo,
  ItemDaLinhaDoTempo,
  LeituraLinhaDoTempo,
  PosicaoNaLinhaDoTempo,
  TIPOS_DE_ITEM,
} from '../portas/leitura-linha-do-tempo';

export const LIMITE_POR_PAGINA = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PedidoLinhaDoTempo {
  filtro: FiltroLinhaDoTempo;
  cursor?: string;
  limite?: number;
  /** Fuso do aparelho, para agrupar por mês como o titular vê o calendário. */
  fuso?: string;
}

export interface GrupoDoMes {
  mes: string; // AAAA-MM
  itens: ItemDaLinhaDoTempo[];
}

export interface ResultadoLinhaDoTempo {
  proximos: ItemDaLinhaDoTempo[];
  passados: GrupoDoMes[];
  cursor: string | null;
}

export type PaginaLinhaDoTempo = ResultadoLinhaDoTempo;

/**
 * Caso de uso (porta de entrada) da Linha do Tempo (RF2): separa os
 * acontecimentos futuros em "Próximos" e agrupa os passados por mês, do mais
 * recente para o mais antigo, com até 50 itens por página.
 *
 * Projeção consolidada dos registros persistidos pelos módulos de Histórico e Indicadores.
 */
export class ConsultarLinhaDoTempo {
  constructor(
    private readonly leitura: LeituraLinhaDoTempo,
    private readonly relogio: Relogio,
  ) {}

  async executar(pedido: PedidoLinhaDoTempo): Promise<ResultadoLinhaDoTempo>;
  async executar(filtros: FiltrosLinhaDoTempo, titularId: string): Promise<ResultadoLinhaDoTempo>;
  async executar(
    pedidoOuFiltros: PedidoLinhaDoTempo | FiltrosLinhaDoTempo,
    titularId?: string,
  ): Promise<ResultadoLinhaDoTempo> {
    let filtro: FiltroLinhaDoTempo;
    let cursor: string | undefined;
    let limiteInformado: number | undefined;
    let fuso: string | undefined;

    if (titularId) {
      const filtros = pedidoOuFiltros as FiltrosLinhaDoTempo;
      filtro = {
        titularId,
        tipos: filtros.tipos,
        de: filtros.dataInicial ?? filtros.de,
        ate: filtros.dataFinal ?? filtros.ate,
      };
      cursor = filtros.cursor;
      limiteInformado = filtros.limite;
      fuso = filtros.fusoHorario ?? filtros.fuso;
    } else {
      const pedido = pedidoOuFiltros as PedidoLinhaDoTempo;
      filtro = pedido.filtro;
      cursor = pedido.cursor;
      limiteInformado = pedido.limite;
      fuso = pedido.fuso;
    }

    const agora = this.relogio.agora();
    const limite = Math.min(Math.max(limiteInformado ?? LIMITE_POR_PAGINA, 1), LIMITE_POR_PAGINA);
    const depoisDe = cursor ? lerCursor(cursor) : null;
    const mesDe = formatadorDeMes(fuso ?? 'America/Fortaleza');

    // "Próximos" só na primeira página; as seguintes continuam o passado.
    const proximos = depoisDe ? [] : await this.leitura.proximos(filtro, agora, limite);
    const passados = await this.leitura.passados(filtro, agora, depoisDe, limite + 1);

    const pagina = passados.slice(0, limite);
    const ultimo = pagina.at(-1);
    return {
      proximos,
      passados: agruparPorMes(pagina, mesDe),
      cursor: passados.length > limite && ultimo ? escreverCursor(ultimo) : null,
    };
  }
}

function agruparPorMes(
  itens: ItemDaLinhaDoTempo[],
  mesDe: (data: Date) => string,
): GrupoDoMes[] {
  const grupos: GrupoDoMes[] = [];
  for (const item of itens) {
    const mes = mesDe(item.data);
    const atual = grupos.at(-1);
    if (atual?.mes === mes) {
      atual.itens.push(item);
    } else {
      grupos.push({ mes, itens: [item] });
    }
  }
  return grupos;
}

function formatadorDeMes(fuso: string): (data: Date) => string {
  try {
    const formato = new Intl.DateTimeFormat('en-CA', {
      timeZone: fuso,
      year: 'numeric',
      month: '2-digit',
    });
    return (data) => formato.format(data);
  } catch {
    throw new RegraVioladaErro('Fuso horário inválido.');
  }
}

function escreverCursor(item: ItemDaLinhaDoTempo): string {
  const posicao: CursorLinhaDoTempo = { data: item.data, tipo: item.tipo, id: item.id };
  return Buffer.from(JSON.stringify(posicao)).toString('base64url');
}

function lerCursor(cursor: string): PosicaoNaLinhaDoTempo {
  try {
    const bruto = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as Record<string, unknown>;
    const data = new Date(String(bruto.data));
    const tipo = TIPOS_DE_ITEM.find((valor) => valor === bruto.tipo);
    const id = typeof bruto.id === 'string' && UUID.test(bruto.id) ? bruto.id : null;
    if (Number.isNaN(data.getTime()) || !tipo || !id) {
      throw new Error('cursor incompleto');
    }
    return { data, tipo, id };
  } catch {
    throw new RegraVioladaErro('Cursor de paginação inválido.');
  }
}
