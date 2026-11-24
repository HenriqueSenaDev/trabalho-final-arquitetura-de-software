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
 * Preserva as consultas SQL funcionais de consultas e retornos (fluxo principal)
 * e representa estruturalmente a extensão da projeção para exames, tratamentos
 * e medições de saúde, sem exigir tabelas funcionais para esses novos tipos.
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

  /**
   * Projeção funcional de consultas e retornos do módulo Histórico.
   */
  protected consultaSqlConsultasERetornos(titular: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`
      SELECT 'CONSULTA'::text AS tipo, id, data_hora AS data, especialidade AS titulo, local AS detalhe
        FROM consultas
       WHERE titular_id = ${titular}
      UNION ALL
      SELECT 'RETORNO'::text, id, retorno_em, especialidade, profissional
        FROM consultas
       WHERE titular_id = ${titular} AND retorno_em IS NOT NULL
    `;
  }

  /**
   * Representação estrutural da extensão da projeção para exames (módulo Histórico).
   * Acordo com Gabi: os exames possuem id, titular_id, data_hora, titulo e descricao.
   * Não executa SQL funcional enquanto a tabela de exames não estiver integrada.
   */
  protected consultaSqlExames(_titular: Prisma.Sql): Prisma.Sql | null {
    // Quando a tabela de exames estiver disponível:
    // SELECT 'EXAME'::text AS tipo, id, data_hora AS data, titulo, local AS detalhe FROM exames WHERE titular_id = ${titular}
    return null;
  }

  /**
   * Representação estrutural da extensão da projeção para tratamentos (início e fim de medicação/tratamento).
   * Acordo com Gabi: tratamentos possuem id, titular_id, inicio_em, fim_em, medicamento/nome.
   * Não executa SQL funcional enquanto a tabela de tratamentos não estiver integrada.
   */
  protected consultaSqlTratamentos(_titular: Prisma.Sql): Prisma.Sql | null {
    // Quando a tabela de tratamentos estiver disponível:
    // SELECT 'INICIO_TRATAMENTO'::text AS tipo, id, inicio_em AS data, nome AS titulo, posologia AS detalhe FROM tratamentos ...
    // UNION ALL
    // SELECT 'FIM_TRATAMENTO'::text AS tipo, id, fim_em AS data, nome AS titulo, posologia AS detalhe FROM tratamentos ...
    return null;
  }

  /**
   * Representação estrutural da extensão da projeção para medições (módulo Indicadores).
   * As medições possuem id, titular_id, data_hora, tipo e valor formatado com unidade.
   * Não executa SQL funcional enquanto a persistência funcional de medições não estiver integrada.
   */
  protected consultaSqlMedicoes(_titular: Prisma.Sql): Prisma.Sql | null {
    // Quando a tabela de medições estiver disponível:
    // SELECT 'MEDICAO'::text AS tipo, id, data_hora AS data, tipo AS titulo, valor::text AS detalhe FROM medicoes WHERE titular_id = ${titular}
    return null;
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
    const deData = filtro.dataInicial ?? filtro.de;
    const ateData = filtro.dataFinal ?? filtro.ate;
    const de = deData ? Prisma.sql`AND data >= ${utc(deData)}` : Prisma.empty;
    const ate = ateData ? Prisma.sql`AND data < ${utc(ateData)}` : Prisma.empty;

    const subconsultas = [
      this.consultaSqlConsultasERetornos(titular),
      this.consultaSqlExames(titular),
      this.consultaSqlTratamentos(titular),
      this.consultaSqlMedicoes(titular),
    ].filter((sql): sql is Prisma.Sql => sql !== null);

    const corpo = subconsultas.length === 1
      ? subconsultas[0]
      : Prisma.join(subconsultas, ' UNION ALL ');

    const linhas = await this.contexto.cliente.$queryRaw<LinhaProjetada[]>`
      WITH linha AS (
        ${corpo}
      )
      SELECT tipo, id, data, titulo, detalhe
        FROM linha
       WHERE ${janela} ${tipos} ${de} ${ate}
      ${ordem}
       LIMIT ${limite}
    `;

    return linhas.map((linha) => {
      const data = new Date(linha.data);
      return {
        id: linha.id,
        origemId: linha.id,
        tipo: linha.tipo,
        data,
        dataHora: data,
        titulo: linha.titulo,
        detalhe: linha.detalhe,
        resumo: linha.detalhe,
      };
    });
  }
}

function utc(instante: Date): Prisma.Sql {
  return Prisma.sql`${instante.toISOString()}::timestamp`;
}
