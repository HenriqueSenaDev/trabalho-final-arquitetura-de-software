import { ConsultarLinhaDoTempo } from '../../src/modulos/linha-do-tempo/aplicacao/consultar-linha-do-tempo';
import {
  FiltroLinhaDoTempo,
  ItemDaLinhaDoTempo,
  LeituraLinhaDoTempo,
  PosicaoNaLinhaDoTempo,
} from '../../src/modulos/linha-do-tempo/portas/leitura-linha-do-tempo';

const agora = new Date('2026-11-24T12:00:00Z');

const item = (id: string, data: string): ItemDaLinhaDoTempo => ({
  tipo: 'CONSULTA',
  id,
  data: new Date(data),
  titulo: 'Consulta',
  detalhe: null,
});

/** Leitura em memória que respeita a ordenação e a paginação da porta. */
class LeituraEmMemoria extends LeituraLinhaDoTempo {
  constructor(private readonly itens: ItemDaLinhaDoTempo[]) {
    super();
  }

  async proximos(_filtro: FiltroLinhaDoTempo, momento: Date, limite: number) {
    return this.itens
      .filter((i) => i.data > momento)
      .sort((a, b) => a.data.getTime() - b.data.getTime())
      .slice(0, limite);
  }

  async passados(
    _filtro: FiltroLinhaDoTempo,
    momento: Date,
    depoisDe: PosicaoNaLinhaDoTempo | null,
    limite: number,
  ) {
    return this.itens
      .filter((i) => i.data <= momento)
      .sort((a, b) => b.data.getTime() - a.data.getTime() || b.id.localeCompare(a.id))
      .filter(
        (i) =>
          !depoisDe ||
          i.data < depoisDe.data ||
          (i.data.getTime() === depoisDe.data.getTime() && i.id < depoisDe.id),
      )
      .slice(0, limite);
  }
}

describe('Caso de uso: ConsultarLinhaDoTempo', () => {
  const consultar = (itens: ItemDaLinhaDoTempo[]) =>
    new ConsultarLinhaDoTempo(new LeituraEmMemoria(itens), { agora: () => agora });
  const filtro = { titularId: 't' };

  it('separa "Próximos" e agrupa o passado por mês, do mais recente ao mais antigo', async () => {
    const pagina = await consultar([
      item('a', '2026-12-10T10:00:00Z'),
      item('b', '2026-11-20T10:00:00Z'),
      item('c', '2026-11-02T10:00:00Z'),
      item('d', '2026-09-15T10:00:00Z'),
    ]).executar({ filtro });

    expect(pagina.proximos.map((i) => i.id)).toEqual(['a']);
    expect(pagina.passados.map((g) => [g.mes, g.itens.map((i) => i.id)])).toEqual([
      ['2026-11', ['b', 'c']],
      ['2026-09', ['d']],
    ]);
    expect(pagina.cursor).toBeNull();
  });

  it('agrupa pelo mês no fuso do titular', async () => {
    // 1º de novembro 01:00 UTC ainda é 31 de outubro em Fortaleza (UTC-3).
    const pagina = await consultar([item('a', '2026-11-01T01:00:00Z')]).executar({
      filtro,
      fuso: 'America/Fortaleza',
    });
    expect(pagina.passados[0].mes).toBe('2026-10');
  });

  it('pagina o passado por cursor, sem repetir itens', async () => {
    const uuid = (i: number) => `00000000-0000-4000-8000-00000000000${i}`;
    const itens = Array.from({ length: 5 }, (_, i) => item(uuid(i), `2026-10-0${i + 1}T10:00:00Z`));
    const caso = consultar(itens);

    const primeira = await caso.executar({ filtro, limite: 2 });
    const segunda = await caso.executar({ filtro, limite: 2, cursor: primeira.cursor! });
    const terceira = await caso.executar({ filtro, limite: 2, cursor: segunda.cursor! });

    const ids = [primeira, segunda, terceira].flatMap((p) =>
      p.passados.flatMap((g) => g.itens.map((i) => i.id)),
    );
    expect(ids).toEqual([4, 3, 2, 1, 0].map(uuid));
    expect(terceira.cursor).toBeNull();
  });
});
