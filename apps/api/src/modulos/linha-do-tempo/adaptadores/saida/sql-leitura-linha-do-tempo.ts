import { Injectable } from '@nestjs/common';
import { Prisma } from '@personal-health/database';
import { ContextoPrisma } from '../../../../compartilhado/adaptadores/contexto-prisma';
import {
  FiltroLinhaDoTempo,
  ItemDaLinhaDoTempo,
  LeituraLinhaDoTempo,
  PosicaoNaLinhaDoTempo,
  TipoDeItem,
} from '../../portas/leitura-linha-do-tempo';

interface LinhaProjetada {
  tipo: TipoDeItem;
  id: string;
  data: Date;
  titulo: string;
  detalhe: string | null;
}

/**
 * Adaptador da porta de leitura (ADR 02). Monta a projeção na hora da
 * consulta, direto sobre as tabelas vigentes, paginada por titular, data,
 * tipo e identificador. É o único ponto da API que lê tabelas de outro
 * módulo, e só para leitura.
 *
 * As colunas são `timestamp` em UTC; os instantes entram como texto ISO
 * convertido para `timestamp`, o que independe do fuso da sessão do banco.
 */
@Injectable()
export class SqlLeituraLinhaDoTempo extends LeituraLinhaDoTempo {
  constructor(private readonly contexto: ContextoPrisma) {
    super();
  }

  proximos(
    filtro: FiltroLinhaDoTempo,
    agora: Date,
    limite: number,
  ): Promise<ItemDaLinhaDoTempo[]> {
    return this.ler(
      filtro,
      Prisma.sql`data > ${utc(agora)}`,
      Prisma.sql`ORDER BY data ASC, tipo ASC, id ASC`,
      limite,
    );
  }

  passados(
    filtro: FiltroLinhaDoTempo,
    agora: Date,
    depoisDe: PosicaoNaLinhaDoTempo | null,
    limite: number,
  ): Promise<ItemDaLinhaDoTempo[]> {
    const continuacao = depoisDe
      ? Prisma.sql`AND (data, tipo, id) < (${utc(depoisDe.data)}, ${depoisDe.tipo}, ${depoisDe.id}::uuid)`
      : Prisma.empty;
    return this.ler(
      filtro,
      Prisma.sql`data <= ${utc(agora)} ${continuacao}`,
      Prisma.sql`ORDER BY data DESC, tipo DESC, id DESC`,
      limite,
    );
  }

  private async ler(
    filtro: FiltroLinhaDoTempo,
    janela: Prisma.Sql,
    ordem: Prisma.Sql,
    limite: number,
  ): Promise<ItemDaLinhaDoTempo[]> {
    const titular = Prisma.sql`${filtro.titularId}::uuid`;
    const tipos = filtro.tipos?.length
      ? Prisma.sql`AND tipo = ANY(${filtro.tipos}::text[])`
      : Prisma.empty;
    const de = filtro.de ? Prisma.sql`AND data >= ${utc(filtro.de)}` : Prisma.empty;
    const ate = filtro.ate ? Prisma.sql`AND data < ${utc(filtro.ate)}` : Prisma.empty;

    const linhas = await this.contexto.cliente.$queryRaw<LinhaProjetada[]>`
      WITH linha AS (
        SELECT 'CONSULTA'::text AS tipo, id, data_hora AS data, especialidade AS titulo, local AS detalhe
          FROM consultas
         WHERE titular_id = ${titular}
        UNION ALL
        SELECT 'RETORNO'::text, id, retorno_em, especialidade, profissional
          FROM consultas
         WHERE titular_id = ${titular} AND retorno_em IS NOT NULL
      )
      SELECT tipo, id, data, titulo, detalhe
        FROM linha
       WHERE ${janela} ${tipos} ${de} ${ate}
      ${ordem}
       LIMIT ${limite}
    `;

    return linhas.map((linha) => ({ ...linha, data: new Date(linha.data) }));
  }
}

function utc(instante: Date): Prisma.Sql {
  return Prisma.sql`${instante.toISOString()}::timestamp`;
}
