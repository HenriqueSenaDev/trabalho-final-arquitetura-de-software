import { ContextoPrisma } from '../../src/compartilhado/adaptadores/contexto-prisma';
import {
  FuncionalidadeIndisponivelErro,
  RecursoIndisponivelErro,
  RegraVioladaErro,
} from '../../src/compartilhado/dominio/erros';
import { Relogio } from '../../src/compartilhado/portas/relogio';
import { PrismaLeituraIndicadores } from '../../src/modulos/indicadores/adaptadores/saida/prisma-leitura-indicadores';
import { PrismaRepositorioMedicoes } from '../../src/modulos/indicadores/adaptadores/saida/prisma-repositorio-medicoes';
import { AlterarMedicao } from '../../src/modulos/indicadores/aplicacao/alterar-medicao';
import { ConsultarEvolucaoIndicadores } from '../../src/modulos/indicadores/aplicacao/consultar-evolucao-indicadores';
import { ConsultarMedicoes } from '../../src/modulos/indicadores/aplicacao/consultar-medicoes';
import { ExcluirMedicao } from '../../src/modulos/indicadores/aplicacao/excluir-medicao';
import { RegistrarMedicao } from '../../src/modulos/indicadores/aplicacao/registrar-medicao';
import { Medicao, Peso, PressaoArterial } from '../../src/modulos/indicadores/dominio/medicao';
import {
  EvolucaoIndicador,
  LeituraIndicadores,
  PeriodoConsulta,
} from '../../src/modulos/indicadores/portas/leitura-indicadores';
import {
  FiltrosMedicao,
  RepositorioMedicoes,
} from '../../src/modulos/indicadores/portas/repositorio-medicoes';

class RepositorioMedicoesEmMemoria extends RepositorioMedicoes {
  private itens: Medicao[] = [];

  async salvar(medicao: Medicao): Promise<void> {
    const indice = this.itens.findIndex((m) => m.id === medicao.id);
    if (indice >= 0) {
      this.itens[indice] = medicao;
    } else {
      this.itens.push(medicao);
    }
  }

  async buscarPorId(id: string, titularId: string): Promise<Medicao | null> {
    const encontrada = this.itens.find((m) => m.id === id && m.titularId === titularId);
    return encontrada ?? null;
  }

  async listar(filtros: FiltrosMedicao, titularId: string): Promise<Medicao[]> {
    return this.itens.filter((m) => {
      if (m.titularId !== titularId) return false;
      if (filtros.tipo && m.tipo !== filtros.tipo) return false;
      if (filtros.de && m.dataHora < filtros.de) return false;
      if (filtros.ate && m.dataHora >= filtros.ate) return false;
      return true;
    });
  }

  async excluir(id: string, titularId: string): Promise<boolean> {
    const totalInicial = this.itens.length;
    this.itens = this.itens.filter((m) => !(m.id === id && m.titularId === titularId));
    return this.itens.length < totalInicial;
  }
}

class LeituraIndicadoresEmMemoria extends LeituraIndicadores {
  async consultarEvolucao(
    tipo: string,
    periodo: PeriodoConsulta,
    titularId: string,
  ): Promise<EvolucaoIndicador> {
    return {
      tipo,
      titularId,
      periodo,
      pontos: [
        {
          dataHora: new Date('2026-11-20T10:00:00Z'),
          valor: 70.0,
          unidade: 'kg',
        },
        {
          dataHora: new Date('2026-11-24T10:00:00Z'),
          valor: 69.2,
          unidade: 'kg',
        },
      ],
    };
  }
}

describe('Casos de uso e adaptadores: Indicadores (C3 e C4)', () => {
  const agora = new Date('2026-11-24T12:00:00Z');
  const relogio: Relogio = { agora: () => agora };
  const titularId = '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0001';
  const outroTitular = '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0002';

  describe('Fluxos de negócio com repositório em memória', () => {
    let repo: RepositorioMedicoesEmMemoria;
    let registrar: RegistrarMedicao;
    let alterar: AlterarMedicao;
    let excluir: ExcluirMedicao;
    let consultar: ConsultarMedicoes;
    let evolucao: ConsultarEvolucaoIndicadores;

    beforeEach(() => {
      repo = new RepositorioMedicoesEmMemoria();
      registrar = new RegistrarMedicao(repo, relogio);
      alterar = new AlterarMedicao(repo, relogio);
      excluir = new ExcluirMedicao(repo);
      consultar = new ConsultarMedicoes(repo);
      evolucao = new ConsultarEvolucaoIndicadores(new LeituraIndicadoresEmMemoria());
    });

    it('registra uma nova medição e a recupera por listagem', async () => {
      const dataHora = new Date('2026-11-24T09:00:00Z');
      const medicao = await registrar.executar(
        {
          tipo: 'PESO',
          valor: new Peso(75.4),
          dataHora,
        },
        titularId,
      );

      expect(medicao.id).toBeDefined();
      expect(medicao.titularId).toBe(titularId);

      const lista = await consultar.executar({}, titularId);
      expect(lista).toHaveLength(1);
      expect(lista[0].id).toBe(medicao.id);
    });

    it('recusa registro de medição no futuro', async () => {
      const futuro = new Date('2026-11-25T10:00:00Z');
      await expect(
        registrar.executar(
          {
            tipo: 'PESO',
            valor: new Peso(75.4),
            dataHora: futuro,
          },
          titularId,
        ),
      ).rejects.toThrow(RegraVioladaErro);
    });

    it('altera medição existente do titular', async () => {
      const medicao = await registrar.executar(
        {
          tipo: 'PESO',
          valor: new Peso(80),
          dataHora: new Date('2026-11-24T08:00:00Z'),
        },
        titularId,
      );

      const novaData = new Date('2026-11-24T10:00:00Z');
      const alterada = await alterar.executar(
        medicao.id,
        {
          valor: new Peso(79),
          dataHora: novaData,
        },
        titularId,
      );

      expect(alterada.valor).toEqual(new Peso(79));
      expect(alterada.dataHora).toEqual(novaData);
    });

    it('impede titular de alterar ou excluir medição alheia (ADR 04)', async () => {
      const medicao = await registrar.executar(
        {
          tipo: 'PRESSAO_ARTERIAL',
          valor: new PressaoArterial(120, 80),
          dataHora: new Date('2026-11-24T08:00:00Z'),
        },
        titularId,
      );

      await expect(
        alterar.executar(medicao.id, { valor: new PressaoArterial(130, 85) }, outroTitular),
      ).rejects.toThrow(RecursoIndisponivelErro);

      await expect(excluir.executar(medicao.id, outroTitular)).rejects.toThrow(
        RecursoIndisponivelErro,
      );
    });

    it('exclui medição e confirma que não aparece mais na listagem', async () => {
      const medicao = await registrar.executar(
        {
          tipo: 'PESO',
          valor: new Peso(70),
          dataHora: new Date('2026-11-24T08:00:00Z'),
        },
        titularId,
      );

      await excluir.executar(medicao.id, titularId);
      const lista = await consultar.executar({}, titularId);
      expect(lista).toHaveLength(0);
    });

    it('recupera série cronológica de evolução sem interpretação médica', async () => {
      const resultado = await evolucao.executar(
        'PESO',
        { de: new Date('2026-11-01T00:00:00Z') },
        titularId,
      );

      expect(resultado.tipo).toBe('PESO');
      expect(resultado.titularId).toBe(titularId);
      expect(resultado.pontos).toHaveLength(2);
      expect(resultado.pontos[0]).toMatchObject({ valor: 70.0, unidade: 'kg' });
      // Confirma ausência de conclusões médicas ou diagnósticas
      expect(JSON.stringify(resultado)).not.toContain('diagnostico');
      expect(JSON.stringify(resultado)).not.toContain('recomendacao');
    });
  });

  describe('Adaptadores Prisma (funcionalidades secundárias não integradas fisicamente)', () => {
    const contextoFalso = {} as ContextoPrisma;
    const prismaRepo = new PrismaRepositorioMedicoes(contextoFalso);
    const prismaLeitura = new PrismaLeituraIndicadores(contextoFalso);

    it('lança FuncionalidadeIndisponivelErro (traduzido para 503 HTTP) no repositório', async () => {
      const medicao = Medicao.registrar(
        {
          titularId,
          tipo: 'PESO',
          valor: new Peso(70),
          dataHora: new Date('2026-11-24T09:00:00Z'),
        },
        agora,
      );

      await expect(prismaRepo.salvar(medicao)).rejects.toThrow(FuncionalidadeIndisponivelErro);
      await expect(prismaRepo.buscarPorId('qualquer', titularId)).rejects.toThrow(
        FuncionalidadeIndisponivelErro,
      );
      await expect(prismaRepo.listar({}, titularId)).rejects.toThrow(
        FuncionalidadeIndisponivelErro,
      );
      await expect(prismaRepo.excluir('qualquer', titularId)).rejects.toThrow(
        FuncionalidadeIndisponivelErro,
      );
    });

    it('lança FuncionalidadeIndisponivelErro (traduzido para 503 HTTP) na leitura de evolução', async () => {
      await expect(prismaLeitura.consultarEvolucao('PESO', {}, titularId)).rejects.toThrow(
        FuncionalidadeIndisponivelErro,
      );
    });
  });
});
