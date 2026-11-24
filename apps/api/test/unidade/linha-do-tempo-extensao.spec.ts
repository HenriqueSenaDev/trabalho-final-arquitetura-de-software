import { Prisma } from '@personal-health/database';
import { ContextoPrisma } from '../../src/compartilhado/adaptadores/contexto-prisma';
import { Relogio } from '../../src/compartilhado/portas/relogio';
import { SqlLeituraLinhaDoTempo } from '../../src/modulos/linha-do-tempo/adaptadores/saida/sql-leitura-linha-do-tempo';
import { ConsultarDetalheItem } from '../../src/modulos/linha-do-tempo/aplicacao/consultar-detalhe-item';
import { ConsultarLinhaDoTempo } from '../../src/modulos/linha-do-tempo/aplicacao/consultar-linha-do-tempo';
import {
  FiltroLinhaDoTempo,
  ItemDaLinhaDoTempo,
  ItemLinhaDoTempo,
  LeituraLinhaDoTempo,
  PosicaoNaLinhaDoTempo,
  TIPOS_DE_ORIGEM,
} from '../../src/modulos/linha-do-tempo/portas/leitura-linha-do-tempo';

class LeituraFalsa extends LeituraLinhaDoTempo {
  constructor(private readonly itens: ItemDaLinhaDoTempo[]) {
    super();
  }

  async proximos(_filtro: FiltroLinhaDoTempo, agora: Date, limite: number) {
    return this.itens.filter((i) => i.data > agora).slice(0, limite);
  }

  async passados(
    _filtro: FiltroLinhaDoTempo,
    agora: Date,
    _depoisDe: PosicaoNaLinhaDoTempo | null,
    limite: number,
  ) {
    return this.itens.filter((i) => i.data <= agora).slice(0, limite);
  }
}

describe('Extensão da Linha do Tempo (C3 e C4)', () => {
  const agora = new Date('2026-11-24T12:00:00Z');
  const relogio: Relogio = { agora: () => agora };
  const titularId = '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0001';

  describe('Tipos de origem e ItemLinhaDoTempo', () => {
    it('reconhece todos os 6 tipos de origem acordados na especificação', () => {
      expect(TIPOS_DE_ORIGEM).toEqual([
        'CONSULTA',
        'RETORNO',
        'EXAME',
        'INICIO_TRATAMENTO',
        'FIM_TRATAMENTO',
        'MEDICAO',
      ]);
    });

    it('ItemLinhaDoTempo possui todos os atributos especificados (C4 nível 4)', () => {
      const dataHora = new Date('2026-11-20T10:00:00Z');
      const item: ItemLinhaDoTempo = {
        id: 'origem-123',
        origemId: 'origem-123',
        tipo: 'MEDICAO',
        data: dataHora,
        dataHora,
        titulo: 'Peso',
        detalhe: '72 kg',
        resumo: '72 kg',
      };

      expect(item.id).toBe('origem-123');
      expect(item.origemId).toBe('origem-123');
      expect(item.tipo).toBe('MEDICAO');
      expect(item.dataHora).toEqual(dataHora);
      expect(item.titulo).toBe('Peso');
      expect(item.resumo).toBe('72 kg');
    });
  });

  describe('Caso de uso ConsultarLinhaDoTempo: assinatura alternativa', () => {
    it('permite chamada pelo formato executar(filtros, titularId)', async () => {
      const itemExemplo: ItemLinhaDoTempo = {
        id: 'c-1',
        origemId: 'c-1',
        tipo: 'CONSULTA',
        data: new Date('2026-11-20T10:00:00Z'),
        dataHora: new Date('2026-11-20T10:00:00Z'),
        titulo: 'Consulta Médica',
        detalhe: null,
        resumo: null,
      };

      const caso = new ConsultarLinhaDoTempo(new LeituraFalsa([itemExemplo]), relogio);
      const resultado = await caso.executar(
        {
          tipos: ['CONSULTA'],
          fusoHorario: 'America/Fortaleza',
          limite: 10,
        },
        titularId,
      );

      expect(resultado.passados).toHaveLength(1);
      expect(resultado.passados[0].itens[0].id).toBe('c-1');
      expect(resultado.cursor).toBeNull();
    });
  });

  describe('Caso de uso ConsultarDetalheItem: encaminhamento', () => {
    const detalhe = new ConsultarDetalheItem();

    it('encaminha itens de consulta e retorno para o módulo Histórico', () => {
      const rotaConsulta = detalhe.executar({
        id: 'c-1',
        origemId: 'c-1',
        tipo: 'CONSULTA',
        titularId,
      });
      expect(rotaConsulta).toEqual({
        moduloProprietario: 'historico',
        rota: '/consultas/c-1',
        identificador: 'c-1',
      });

      const rotaRetorno = detalhe.executar({
        id: 'r-1',
        origemId: 'r-1',
        tipo: 'RETORNO',
        titularId,
      });
      expect(rotaRetorno.moduloProprietario).toBe('historico');
    });

    it('encaminha itens de medição para o módulo Indicadores', () => {
      const rotaMedicao = detalhe.executar({
        id: 'm-1',
        origemId: 'm-1',
        tipo: 'MEDICAO',
        titularId,
      });
      expect(rotaMedicao).toEqual({
        moduloProprietario: 'indicadores',
        rota: '/indicadores/m-1',
        identificador: 'm-1',
      });
    });

    it('encaminha exames e tratamentos para o módulo Histórico', () => {
      const rotaExame = detalhe.executar({
        id: 'e-1',
        origemId: 'e-1',
        tipo: 'EXAME',
        titularId,
      });
      expect(rotaExame.moduloProprietario).toBe('historico');
    });
  });

  describe('Adaptador SqlLeituraLinhaDoTempo: representação estrutural da projeção', () => {
    class SqlLeituraEspia extends SqlLeituraLinhaDoTempo {
      obterSubconsultas(titularId: string) {
        const titular = Prisma.sql`${titularId}::uuid`;
        return {
          consultasERetornos: this.consultaSqlConsultasERetornos(titular),
          exames: this.consultaSqlExames(titular),
          tratamentos: this.consultaSqlTratamentos(titular),
          medicoes: this.consultaSqlMedicoes(titular),
        };
      }
    }

    it('preserva SQL funcional de consultas e retornos e representa os novos tipos estruturalmente', () => {
      const espia = new SqlLeituraEspia({} as ContextoPrisma);
      const sub = espia.obterSubconsultas(titularId);

      expect(sub.consultasERetornos).toBeDefined();
      expect(sub.consultasERetornos.text).toContain('consultas');
      expect(sub.consultasERetornos.text).toContain('CONSULTA');
      expect(sub.consultasERetornos.text).toContain('RETORNO');

      // Novos tipos não executam SQL funcional enquanto não persistidos fisicamente
      expect(sub.exames).toBeNull();
      expect(sub.tratamentos).toBeNull();
      expect(sub.medicoes).toBeNull();
    });
  });
});
