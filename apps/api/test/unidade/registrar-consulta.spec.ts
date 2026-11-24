/**
 * O caso de uso RegistrarConsulta com adaptadores em memória e o módulo
 * Lembretes real: as portas permitem testar a regra de "consulta e aviso na
 * mesma transação" sem banco.
 */
import { ConflitoErro, RegraVioladaErro } from '../../src/compartilhado/dominio/erros';
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
const idDoCliente = '6f0c7a4e-1d2b-4c3a-8e9f-0a1b2c3d4e5f';

describe('Caso de uso: RegistrarConsulta', () => {
  let consultas: ConsultasEmMemoria;
  let agendamentos: AgendamentosEmMemoria;
  let registrar: RegistrarConsulta;

  beforeEach(() => {
    consultas = new ConsultasEmMemoria();
    agendamentos = new AgendamentosEmMemoria();
    registrar = new RegistrarConsulta(
      consultas,
      new AvisosDeConsulta(agendamentos, relogio),
      new UnidadeEmMemoria([consultas, agendamentos]),
      relogio,
    );
  });

  it('grava a consulta futura e agenda o aviso pelo contrato de Lembretes', async () => {
    const resultado = await registrar.executar({
      titularId,
      dataHora: new Date('2026-12-01T09:00:00Z'),
      especialidade: 'Cardiologia',
      lembrete: { antecedenciaMinutos: 24 * 60 },
    });

    expect(consultas.itens.has(resultado.id)).toBe(true);
    expect(agendamentos.daConsulta(resultado.id)).toMatchObject({
      titularId,
      instante: new Date('2026-11-30T09:00:00Z'),
      estado: 'PENDENTE',
      versao: 1,
    });
    expect(resultado.avisoAgendadoPara).toEqual(new Date('2026-11-30T09:00:00Z'));
  });

  it('consulta sem pedido de aviso não gera agendamento', async () => {
    const resultado = await registrar.executar({
      titularId,
      dataHora: new Date('2026-10-01T09:00:00Z'),
      especialidade: 'Clínico geral',
    });
    expect(agendamentos.daConsulta(resultado.id)).toBeUndefined();
  });

  it('se o agendamento falha, a consulta também não fica gravada', async () => {
    agendamentos.falha = new Error('banco indisponível');

    await expect(
      registrar.executar({
        titularId,
        dataHora: new Date('2026-12-01T09:00:00Z'),
        especialidade: 'Cardiologia',
        lembrete: { antecedenciaMinutos: 60 },
      }),
    ).rejects.toThrow('banco indisponível');
    expect(consultas.itens.size).toBe(0);
  });

  it('regra violada é recusada antes de gravar qualquer coisa', async () => {
    await expect(
      registrar.executar({
        titularId,
        dataHora: new Date('2026-11-24T12:30:00Z'),
        especialidade: 'Cardiologia',
        lembrete: { antecedenciaMinutos: 60 },
      }),
    ).rejects.toThrow(RegraVioladaErro);
    expect(consultas.itens.size).toBe(0);
    expect(agendamentos.itens.size).toBe(0);
  });

  it('repetir o pedido com o mesmo id devolve a mesma consulta, sem duplicar consulta nem aviso', async () => {
    const pedido = {
      id: idDoCliente,
      titularId,
      dataHora: new Date('2026-12-01T09:00:00Z'),
      especialidade: 'Cardiologia',
      lembrete: { antecedenciaMinutos: 60 },
    };

    const primeira = await registrar.executar(pedido);
    const repetida = await registrar.executar(pedido);

    expect(repetida).toEqual(primeira);
    expect(primeira.id).toBe(idDoCliente);
    expect(consultas.itens.size).toBe(1);
    expect(agendamentos.daConsulta(idDoCliente)?.versao).toBe(1);
  });

  it('id que já pertence a outro titular é recusado sem revelar nem alterar a consulta alheia', async () => {
    await registrar.executar({
      id: idDoCliente,
      titularId: outroTitular,
      dataHora: new Date('2026-12-01T09:00:00Z'),
      especialidade: 'Cardiologia',
    });

    await expect(
      registrar.executar({
        id: idDoCliente,
        titularId,
        dataHora: new Date('2026-12-02T09:00:00Z'),
        especialidade: 'Dermatologia',
      }),
    ).rejects.toThrow(ConflitoErro);
    expect(consultas.itens.get(idDoCliente)?.titularId).toBe(outroTitular);
  });
});
