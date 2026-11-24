/**
 * Reagendar e cancelar (RF4, ADR 03): alterar a consulta revisa o aviso na
 * mesma transação, sempre gerando uma nova versão do agendamento.
 */
import {
  RecursoIndisponivelErro,
  RegraVioladaErro,
} from '../../src/compartilhado/dominio/erros';
import { AlterarConsulta } from '../../src/modulos/historico/aplicacao/alterar-consulta';
import { ExcluirConsulta } from '../../src/modulos/historico/aplicacao/excluir-consulta';
import { RegistrarConsulta } from '../../src/modulos/historico/aplicacao/registrar-consulta';
import { AvisosDeConsulta } from '../../src/modulos/lembretes/aplicacao/avisos-de-consulta';
import {
  AgendamentosEmMemoria,
  ConsultasEmMemoria,
  relogioFixo,
  UnidadeEmMemoria,
} from './em-memoria';

const agora = new Date('2026-11-24T12:00:00Z');
const relogio = relogioFixo(agora);
const titularId = '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0001';
const outroTitular = '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0002';

describe('Casos de uso: AlterarConsulta e ExcluirConsulta', () => {
  let consultas: ConsultasEmMemoria;
  let agendamentos: AgendamentosEmMemoria;
  let alterar: AlterarConsulta;
  let excluir: ExcluirConsulta;
  let consultaId: string;

  beforeEach(async () => {
    consultas = new ConsultasEmMemoria();
    agendamentos = new AgendamentosEmMemoria();
    const lembretes = new AvisosDeConsulta(agendamentos, relogio);
    const unidade = new UnidadeEmMemoria([consultas, agendamentos]);
    alterar = new AlterarConsulta(consultas, lembretes, unidade, relogio);
    excluir = new ExcluirConsulta(consultas, lembretes, unidade);

    // Consulta em 1º/12 às 09:00 com aviso 1 dia antes (versão 1).
    ({ id: consultaId } = await new RegistrarConsulta(consultas, lembretes, unidade, relogio).executar({
      titularId,
      dataHora: new Date('2026-12-01T09:00:00Z'),
      especialidade: 'Cardiologia',
      retornoEm: new Date('2027-01-10T09:00:00Z'),
      lembrete: { antecedenciaMinutos: 24 * 60 },
    }));
  });

  const aviso = () => agendamentos.daConsulta(consultaId);

  it('remarcar a consulta reagenda o aviso com a mesma antecedência, em nova versão', async () => {
    const resultado = await alterar.executar({
      titularId,
      id: consultaId,
      dataHora: new Date('2026-12-05T14:00:00Z'),
    });

    expect(resultado.avisoAgendadoPara).toEqual(new Date('2026-12-04T14:00:00Z'));
    expect(aviso()).toMatchObject({ estado: 'PENDENTE', versao: 2 });
    expect(consultas.itens.get(consultaId)?.paraLeitura()).toMatchObject({
      id: consultaId,
      dataHora: new Date('2026-12-05T14:00:00Z'),
      registradaEm: agora,
    });
  });

  it('lembrete explícito reagenda com a nova antecedência', async () => {
    const resultado = await alterar.executar({
      titularId,
      id: consultaId,
      lembrete: { antecedenciaMinutos: 60 },
    });

    expect(resultado.avisoAgendadoPara).toEqual(new Date('2026-12-01T08:00:00Z'));
    expect(aviso()).toMatchObject({ estado: 'PENDENTE', versao: 2 });
  });

  it('lembrete null cancela o aviso: nova versão, CANCELADO', async () => {
    const resultado = await alterar.executar({ titularId, id: consultaId, lembrete: null });

    expect(resultado.avisoAgendadoPara).toBeNull();
    expect(aviso()).toMatchObject({ estado: 'CANCELADO', versao: 2 });
  });

  it('corrigir a consulta para uma data passada cancela o aviso pendente', async () => {
    const resultado = await alterar.executar({
      titularId,
      id: consultaId,
      dataHora: new Date('2026-11-20T09:00:00Z'),
    });

    expect(resultado.avisoAgendadoPara).toBeNull();
    expect(aviso()).toMatchObject({ estado: 'CANCELADO', versao: 2 });
  });

  it('corrigir um campo sem mudar a data não mexe no aviso', async () => {
    const resultado = await alterar.executar({ titularId, id: consultaId, local: 'Clínica Norte' });

    expect(resultado.avisoAgendadoPara).toEqual(new Date('2026-11-30T09:00:00Z'));
    expect(aviso()).toMatchObject({ estado: 'PENDENTE', versao: 1 });
    expect(consultas.itens.get(consultaId)?.paraLeitura().local).toBe('Clínica Norte');
  });

  it('aviso que cairia no passado é recusado e nada muda', async () => {
    await expect(
      alterar.executar({
        titularId,
        id: consultaId,
        dataHora: new Date('2026-11-24T12:30:00Z'),
        lembrete: { antecedenciaMinutos: 60 },
      }),
    ).rejects.toThrow(RegraVioladaErro);
    expect(consultas.itens.get(consultaId)?.dataHora).toEqual(new Date('2026-12-01T09:00:00Z'));
    expect(aviso()).toMatchObject({ estado: 'PENDENTE', versao: 1 });
  });

  it('remarcar para depois do retorno é recusado', async () => {
    await expect(
      alterar.executar({ titularId, id: consultaId, dataHora: new Date('2027-02-01T09:00:00Z') }),
    ).rejects.toThrow(new RegraVioladaErro('O retorno precisa ser posterior à consulta.'));
  });

  it('outro titular não altera nem exclui: recurso indisponível e nada muda', async () => {
    await expect(
      alterar.executar({ titularId: outroTitular, id: consultaId, lembrete: null }),
    ).rejects.toThrow(RecursoIndisponivelErro);
    await expect(excluir.executar({ titularId: outroTitular, id: consultaId })).rejects.toThrow(
      RecursoIndisponivelErro,
    );
    expect(consultas.itens.has(consultaId)).toBe(true);
    expect(aviso()).toMatchObject({ estado: 'PENDENTE', versao: 1 });
  });

  it('excluir remove a consulta e o retorno e cancela o aviso pendente', async () => {
    await excluir.executar({ titularId, id: consultaId });

    expect(consultas.itens.has(consultaId)).toBe(false);
    expect(aviso()).toMatchObject({ estado: 'CANCELADO', versao: 2 });
  });
});
