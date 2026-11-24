import { RegraVioladaErro } from '../../src/compartilhado/dominio/erros';
import { Agendamento } from '../../src/modulos/lembretes/dominio/agendamento';

const agora = new Date('2026-11-24T12:00:00Z');
const pedido = {
  titularId: '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0001',
  consultaId: '6f0c7a4e-1d2b-4c3a-8e9f-0a1b2c3d4e5f',
  instante: new Date('2026-11-30T09:00:00Z'),
};

describe('Domínio: Agendamento (ADR 03)', () => {
  it('nasce pendente na versão 1, sem versão lida', () => {
    const agendamento = Agendamento.paraConsulta(pedido, agora);
    expect(agendamento.paraGravacao()).toMatchObject({ estado: 'PENDENTE', versao: 1 });
    expect(agendamento.versaoLida).toBeNull();
  });

  it('reagendar cria nova versão pendente, mesmo depois de enviado', () => {
    const enviado = Agendamento.restaurar({
      ...Agendamento.paraConsulta(pedido, agora).paraGravacao(),
      estado: 'ENVIADO',
      versao: 3,
    });

    enviado.reagendar(new Date('2026-12-10T09:00:00Z'), agora);

    expect(enviado.paraGravacao()).toMatchObject({
      estado: 'PENDENTE',
      versao: 4,
      instante: new Date('2026-12-10T09:00:00Z'),
    });
    expect(enviado.versaoLida).toBe(3);
  });

  it('não reagenda para o passado', () => {
    const agendamento = Agendamento.paraConsulta(pedido, agora);
    expect(() => agendamento.reagendar(new Date('2026-11-01T09:00:00Z'), agora)).toThrow(
      RegraVioladaErro,
    );
  });

  it('cancelar só afeta o que está pendente', () => {
    const pendente = Agendamento.paraConsulta(pedido, agora);
    expect(pendente.cancelar()).toBe(true);
    expect(pendente.paraGravacao()).toMatchObject({ estado: 'CANCELADO', versao: 2 });

    const enviado = Agendamento.restaurar({ ...pendente.paraGravacao(), estado: 'ENVIADO' });
    expect(enviado.cancelar()).toBe(false);
    expect(enviado.paraGravacao().estado).toBe('ENVIADO');
  });
});
