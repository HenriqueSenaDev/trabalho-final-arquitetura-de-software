import { RegraVioladaErro } from '../../src/compartilhado/dominio/erros';
import { Consulta } from '../../src/modulos/historico/dominio/consulta';

const agora = new Date('2026-11-24T12:00:00Z');
const titularId = '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0001';

describe('Domínio: Consulta', () => {
  it('aceita consulta passada ou futura e separa data do acontecimento da data de registro', () => {
    const passada = Consulta.registrar(
      { titularId, dataHora: new Date('2026-10-01T09:00:00Z'), especialidade: 'Clínico geral' },
      agora,
    ).paraLeitura();

    expect(passada.dataHora).toEqual(new Date('2026-10-01T09:00:00Z'));
    expect(passada.registradaEm).toEqual(agora);
  });

  it('recusa retorno anterior à consulta (critério de aceite RF1.1)', () => {
    expect(() =>
      Consulta.registrar(
        {
          titularId,
          dataHora: new Date('2026-12-01T09:00:00Z'),
          retornoEm: new Date('2026-11-30T09:00:00Z'),
          especialidade: 'Cardiologia',
        },
        agora,
      ),
    ).toThrow(new RegraVioladaErro('O retorno precisa ser posterior à consulta.'));
  });

  it('calcula o instante do aviso a partir da antecedência', () => {
    const consulta = Consulta.registrar(
      { titularId, dataHora: new Date('2026-12-01T09:00:00Z'), especialidade: 'Cardiologia' },
      agora,
    );
    expect(consulta.instanteDoAviso(60, agora)).toEqual(new Date('2026-12-01T08:00:00Z'));
  });

  it('não agenda aviso para consulta passada nem aviso que cairia no passado', () => {
    const passada = Consulta.registrar(
      { titularId, dataHora: new Date('2026-11-01T09:00:00Z'), especialidade: 'Cardiologia' },
      agora,
    );
    const daquiAMeiaHora = Consulta.registrar(
      { titularId, dataHora: new Date('2026-11-24T12:30:00Z'), especialidade: 'Cardiologia' },
      agora,
    );

    expect(() => passada.instanteDoAviso(60, agora)).toThrow(RegraVioladaErro);
    expect(() => daquiAMeiaHora.instanteDoAviso(60, agora)).toThrow(RegraVioladaErro);
  });

  it('correção mantém identidade, titular e data de registro (invariantes da seção 4)', () => {
    const original = Consulta.registrar(
      { titularId, dataHora: new Date('2026-12-01T09:00:00Z'), especialidade: 'Cardiologia', local: 'A' },
      agora,
    );

    const corrigida = original
      .corrigir({ dataHora: new Date('2026-12-03T10:00:00Z'), local: null })
      .paraLeitura();

    expect(corrigida).toMatchObject({
      id: original.id,
      titularId,
      dataHora: new Date('2026-12-03T10:00:00Z'),
      especialidade: 'Cardiologia',
      local: null,
      registradaEm: agora,
    });
  });

  it('correção aplica as mesmas regras do registro', () => {
    const consulta = Consulta.registrar(
      {
        titularId,
        dataHora: new Date('2026-12-01T09:00:00Z'),
        retornoEm: new Date('2026-12-20T09:00:00Z'),
        especialidade: 'Cardiologia',
      },
      agora,
    );

    expect(() => consulta.corrigir({ especialidade: '  ' })).toThrow(RegraVioladaErro);
    expect(() => consulta.corrigir({ dataHora: new Date('2026-12-21T09:00:00Z') })).toThrow(
      new RegraVioladaErro('O retorno precisa ser posterior à consulta.'),
    );
  });

  it('remarcação mantém a antecedência do aviso só se ele ainda couber no futuro', () => {
    const remarcada = Consulta.registrar(
      { titularId, dataHora: new Date('2026-12-05T14:00:00Z'), especialidade: 'Cardiologia' },
      agora,
    );
    const emMeiaHora = Consulta.registrar(
      { titularId, dataHora: new Date('2026-11-24T12:30:00Z'), especialidade: 'Cardiologia' },
      agora,
    );

    expect(remarcada.avisoRemarcado(24 * 60, agora)).toEqual(new Date('2026-12-04T14:00:00Z'));
    expect(emMeiaHora.avisoRemarcado(60, agora)).toBeNull();
    expect(remarcada.antecedenciaDe(new Date('2026-12-05T13:00:00Z'))).toBe(60);
  });
});
