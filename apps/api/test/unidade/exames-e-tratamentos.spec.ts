import { PublicadorEventos, TreatmentEvent } from '@personal-health/contracts';
import {
  RecursoIndisponivelErro,
  RegraVioladaErro,
} from '../../src/compartilhado/dominio/erros';
import { UnidadeDeTrabalho } from '../../src/compartilhado/portas/unidade-de-trabalho';
import { Anexo } from '../../src/modulos/historico/dominio/anexo';
import { Exame } from '../../src/modulos/historico/dominio/exame';
import { FrequenciaTratamento } from '../../src/modulos/historico/dominio/frequencia-tratamento';
import { Tratamento } from '../../src/modulos/historico/dominio/tratamento';
import { SaveTreatmentUseCase } from '../../src/modulos/historico/aplicacao/salvar-tratamento';
import { RepositorioTratamentos } from '../../src/modulos/historico/portas/repositorio-tratamentos';

const titularId = '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0001';
const agora = new Date('2026-11-24T12:00:00Z');

describe('Domínio: Exame e Anexo', () => {
  it('aceita data de realização futura', () => {
    const dataFutura = new Date('2027-01-15T09:00:00Z');
    expect(
      Exame.registrar(
        { titularId, tipo: 'Exame agendado', dataRealizacao: dataFutura },
        agora,
      ).paraLeitura().dataRealizacao,
    ).toEqual(dataFutura);
  });

  it('mantém data de realização e registro distintas ao alterar o exame', () => {
    const exame = Exame.registrar(
      { titularId, tipo: 'Hemograma', dataRealizacao: new Date('2026-10-10T09:00:00Z') },
      agora,
    );
    const alterado = exame.alterar({ laboratorio: 'Laboratório Central' }).paraLeitura();

    expect(alterado).toMatchObject({
      id: exame.id,
      titularId,
      tipo: 'Hemograma',
      dataRealizacao: new Date('2026-10-10T09:00:00Z'),
      laboratorio: 'Laboratório Central',
      registradoEm: agora,
      anexos: [],
    });
  });

  it('compõe no máximo cinco anexos pertencentes ao exame', () => {
    let exame = Exame.registrar(
      { titularId, tipo: 'Hemograma', dataRealizacao: agora },
      agora,
    );
    for (let indice = 0; indice < 5; indice += 1) {
      exame = exame.adicionarAnexo(
        Anexo.criar({
          id: `anexo-${indice}`,
          exameId: exame.id,
          nomeArquivo: `${indice}.pdf`,
          tipoMime: 'application/pdf',
          tamanhoBytes: 1024,
          chaveArmazenamento: `exames/${indice}`,
          criadoEm: agora,
        }),
      );
    }

    expect(() =>
      exame.adicionarAnexo(
        Anexo.criar({
          id: 'anexo-extra',
          exameId: exame.id,
          nomeArquivo: 'extra.pdf',
          tipoMime: 'application/pdf',
          tamanhoBytes: 1024,
          chaveArmazenamento: 'exames/extra',
          criadoEm: agora,
        }),
      ),
    ).toThrow(new RegraVioladaErro('Um exame pode ter no máximo cinco anexos.'));
  });

  it('não permite anexar ao exame metadados de outro exame', () => {
    const exame = Exame.registrar(
      { titularId, tipo: 'Hemograma', dataRealizacao: agora },
      agora,
    );
    const anexo = Anexo.criar({
      id: 'anexo-1',
      exameId: 'outro-exame',
      nomeArquivo: 'resultado.pdf',
      tipoMime: 'application/pdf',
      tamanhoBytes: 1024,
      chaveArmazenamento: 'exames/resultado',
      criadoEm: agora,
    });

    expect(() => exame.adicionarAnexo(anexo)).toThrow(
      new RegraVioladaErro('O anexo não pertence a este exame.'),
    );
  });
});

describe('Domínio: Tratamento e FrequenciaTratamento', () => {
  it('exige horário inicial para frequência fixa e não o associa à frequência sob demanda', () => {
    expect(() =>
      Tratamento.registrar(
        {
          titularId,
          medicamento: 'Medicamento',
          dose: '1 comprimido',
          formaAdministracao: 'oral',
          frequencia: FrequenciaTratamento.fixa(8),
          dataInicio: agora,
        },
        agora,
      ),
    ).toThrow(new RegraVioladaErro('A frequência fixa exige um horário inicial.'));

    expect(FrequenciaTratamento.sobDemanda().paraLeitura()).toEqual({
      tipo: 'SOB_DEMANDA',
      intervaloHoras: null,
    });
    expect(() => FrequenciaTratamento.fixa(0)).toThrow(
      new RegraVioladaErro('O intervalo fixo deve ser um inteiro positivo.'),
    );
  });

  describe('Aplicação: SaveTreatmentUseCase', () => {
    it('grava o tratamento e publica o evento dentro da mesma unidade de trabalho', async () => {
      const repositorio = new TratamentosEmMemoria();
      const publicador = new PublicadorEmMemoria();
      const unidade = new UnidadeComTratamentos(repositorio, publicador);
      const casoDeUso = new SaveTreatmentUseCase(repositorio, unidade, publicador);

      const salvo = await casoDeUso.executar(
        {
          medicamento: 'Medicamento',
          dose: '1 comprimido',
          formaAdministracao: 'oral',
          frequencia: FrequenciaTratamento.sobDemanda(),
          dataInicio: agora,
        },
        titularId,
      );

      expect(repositorio.itens.get(salvo.id)).toBe(salvo);
      expect(publicador.eventos).toHaveLength(1);
      expect(publicador.eventos[0]).toMatchObject({
        type: 'TreatmentChanged',
        originId: salvo.id,
        holderId: titularId,
        version: 1,
      });
    });

    it('desfaz a gravação quando a publicação do evento falha', async () => {
      const repositorio = new TratamentosEmMemoria();
      const publicador = new PublicadorEmMemoria();
      publicador.falhar = true;
      const unidade = new UnidadeComTratamentos(repositorio, publicador);
      const casoDeUso = new SaveTreatmentUseCase(repositorio, unidade, publicador);

      await expect(
        casoDeUso.executar(
          {
            medicamento: 'Medicamento',
            dose: '1 comprimido',
            formaAdministracao: 'oral',
            frequencia: FrequenciaTratamento.sobDemanda(),
            dataInicio: agora,
          },
          titularId,
        ),
      ).rejects.toThrow('Falha ao publicar evento.');
      expect(repositorio.itens.size).toBe(0);
    });
  });

  class TratamentosEmMemoria extends RepositorioTratamentos {
    itens = new Map<string, Tratamento>();
    buscas: Array<{ id: string; titular: string }> = [];

    async salvar(tratamento: Tratamento): Promise<void> {
      this.itens.set(tratamento.id, tratamento);
    }

    async buscarPorId(id: string, titular: string): Promise<Tratamento | null> {
      this.buscas.push({ id, titular });
      const tratamento = this.itens.get(id);
      return tratamento?.titularId === titular ? tratamento : null;
    }

    async listarPorTitular(titular: string): Promise<Tratamento[]> {
      return [...this.itens.values()].filter((item) => item.titularId === titular);
    }
  }

  class PublicadorEmMemoria extends PublicadorEventos {
    eventos: TreatmentEvent[] = [];
    falhar = false;

    async publicar(evento: TreatmentEvent): Promise<void> {
      if (this.falhar) throw new Error('Falha ao publicar evento.');
      this.eventos.push(evento);
    }
  }

  class UnidadeComTratamentos extends UnidadeDeTrabalho {
    constructor(
      private readonly repositorio: TratamentosEmMemoria,
      private readonly publicador: PublicadorEmMemoria,
    ) {
      super();
    }

    async executar<T>(trabalho: () => Promise<T>): Promise<T> {
      const tratamentos = new Map(this.repositorio.itens);
      const eventos = [...this.publicador.eventos];
      try {
        return await trabalho();
      } catch (erro) {
        this.repositorio.itens = tratamentos;
        this.publicador.eventos = eventos;
        throw erro;
      }
    }
  }

  it('versiona alterações e produz eventos de tratamento e encerramento', () => {
    const tratamento = Tratamento.registrar(
      {
        titularId,
        medicamento: 'Medicamento',
        dose: '1 comprimido',
        formaAdministracao: 'oral',
        frequencia: FrequenciaTratamento.fixa(8),
        dataInicio: agora,
        horarioInicial: '08:00',
      },
      agora,
    );
    const alterado = tratamento.alterar({ dose: '2 comprimidos' });
    const encerrado = alterado.encerrar(new Date('2026-12-01T10:00:00Z'));

    expect(alterado.eventoAlterado(agora)).toMatchObject({
      type: 'TreatmentChanged',
      originId: tratamento.id,
      holderId: titularId,
      version: 2,
      frequency: { type: 'FIXA', intervalHours: 8 },
    });
    expect(encerrado.eventoEncerrado(agora)).toMatchObject({
      type: 'TreatmentEnded',
      originId: tratamento.id,
      version: 3,
      endedAt: new Date('2026-12-01T10:00:00Z'),
    });
    expect(encerrado.paraLeitura().versao).toBe(3);
    expect(() => encerrado.encerrar(new Date('2026-12-02T10:00:00Z'))).toThrow(
      new RegraVioladaErro('O tratamento já foi encerrado.'),
    );
    expect(() => tratamento.encerrar(new Date('2026-11-23T10:00:00Z'))).toThrow(
      new RegraVioladaErro('A data final não pode anteceder o início do tratamento.'),
    );
    expect(Object.keys(alterado.eventoAlterado(agora))).not.toContain('medication');
    expect(Object.keys(alterado.eventoAlterado(agora))).not.toContain('dose');
  });

  it('não atualiza nem publica para ids inexistentes ou de outro titular', async () => {
    const repositorio = new TratamentosEmMemoria();
    const pertencenteAOutro = Tratamento.registrar(
      {
        id: 'tratamento-outro-titular',
        titularId: 'titular-diferente',
        medicamento: 'Medicamento',
        dose: '1 comprimido',
        formaAdministracao: 'oral',
        frequencia: FrequenciaTratamento.sobDemanda(),
        dataInicio: agora,
      },
      agora,
    );
    repositorio.itens.set(pertencenteAOutro.id, pertencenteAOutro);
    const publicador = new PublicadorEmMemoria();
    const casoDeUso = new SaveTreatmentUseCase(
      repositorio,
      new UnidadeComTratamentos(repositorio, publicador),
      publicador,
    );
    const comando = {
      medicamento: 'Medicamento',
      dose: '1 comprimido',
      formaAdministracao: 'oral',
      frequencia: FrequenciaTratamento.sobDemanda(),
      dataInicio: agora,
    };

    const inexistente = casoDeUso.alterar('nao-existe', comando, titularId);
    const deOutroTitular = casoDeUso.alterar(pertencenteAOutro.id, comando, titularId);
    await expect(inexistente).rejects.toThrow(RecursoIndisponivelErro);
    await expect(deOutroTitular).rejects.toThrow(RecursoIndisponivelErro);
    await expect(inexistente).rejects.toThrow('Recurso indisponível.');
    await expect(deOutroTitular).rejects.toThrow('Recurso indisponível.');
    expect(publicador.eventos).toHaveLength(0);
    expect(repositorio.buscas).toEqual([
      { id: 'nao-existe', titular: titularId },
      { id: pertencenteAOutro.id, titular: titularId },
    ]);
  });
});
