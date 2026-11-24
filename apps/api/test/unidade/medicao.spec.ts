import { RegraVioladaErro } from '../../src/compartilhado/dominio/erros';
import {
  Glicemia,
  Medicao,
  Peso,
  PressaoArterial,
} from '../../src/modulos/indicadores/dominio/medicao';

describe('Domínio: Indicadores e Medições (C4)', () => {
  const agora = new Date('2026-11-24T12:00:00Z');
  const passado = new Date('2026-11-24T10:00:00Z');
  const futuro = new Date('2026-11-24T13:00:00Z');
  const titularId = '0b6f6c1e-6b1a-4c43-9a51-6f1f0d7a0001';

  describe('Objeto de Valor: Peso', () => {
    it('cria peso com valor positivo e unidade kg', () => {
      const peso = new Peso(72.5);
      expect(peso.tipo).toBe('PESO');
      expect(peso.valor).toBe(72.5);
      expect(peso.unidade).toBe('kg');
    });

    it('recusa peso menor ou igual a zero ou inválido', () => {
      expect(() => new Peso(0)).toThrow(RegraVioladaErro);
      expect(() => new Peso(-5)).toThrow(RegraVioladaErro);
      expect(() => new Peso(Number.NaN)).toThrow(RegraVioladaErro);
    });
  });

  describe('Objeto de Valor: PressaoArterial', () => {
    it('cria pressão arterial com sistólica e diastólica como medição única em mmHg', () => {
      const pressao = new PressaoArterial(120, 80);
      expect(pressao.tipo).toBe('PRESSAO_ARTERIAL');
      expect(pressao.sistolica).toBe(120);
      expect(pressao.diastolica).toBe(80);
      expect(pressao.unidade).toBe('mmHg');
    });

    it('recusa pressão com valores não positivos', () => {
      expect(() => new PressaoArterial(0, 80)).toThrow(RegraVioladaErro);
      expect(() => new PressaoArterial(120, -10)).toThrow(RegraVioladaErro);
    });

    it('recusa pressão sistólica menor ou igual à diastólica', () => {
      expect(() => new PressaoArterial(80, 120)).toThrow(RegraVioladaErro);
      expect(() => new PressaoArterial(90, 90)).toThrow(RegraVioladaErro);
    });
  });

  describe('Objeto de Valor: Glicemia', () => {
    it('cria glicemia em mg/dL com contexto JEJUM ou POS_REFEICAO', () => {
      const jejum = new Glicemia(95, 'JEJUM');
      expect(jejum.tipo).toBe('GLICEMIA');
      expect(jejum.valor).toBe(95);
      expect(jejum.unidade).toBe('mg/dL');
      expect(jejum.contexto).toBe('JEJUM');

      const pos = new Glicemia(135, 'POS_REFEICAO');
      expect(pos.contexto).toBe('POS_REFEICAO');
    });

    it('recusa glicemia não positiva ou com contexto inválido', () => {
      expect(() => new Glicemia(-10, 'JEJUM')).toThrow(RegraVioladaErro);
      // @ts-expect-error teste com valor arbitrário
      expect(() => new Glicemia(100, 'ALEATORIO')).toThrow(RegraVioladaErro);
    });
  });

  describe('Agregado: Medicao', () => {
    it('registra uma medição válida no passado ou presente', () => {
      const valor = new Peso(70);
      const medicao = Medicao.registrar(
        {
          titularId,
          tipo: 'PESO',
          valor,
          dataHora: passado,
        },
        agora,
      );

      expect(medicao.id).toBeDefined();
      expect(medicao.titularId).toBe(titularId);
      expect(medicao.tipo).toBe('PESO');
      expect(medicao.valor).toEqual(valor);
      expect(medicao.dataHora).toEqual(passado);
      expect(medicao.registradoEm).toEqual(agora);
    });

    it('recusa medição com data futura (invariante de domínio)', () => {
      const valor = new Peso(70);
      expect(() =>
        Medicao.registrar(
          {
            titularId,
            tipo: 'PESO',
            valor,
            dataHora: futuro,
          },
          agora,
        ),
      ).toThrow(RegraVioladaErro);
    });

    it('recusa medição sem titular informado', () => {
      const valor = new Peso(70);
      expect(() =>
        Medicao.registrar(
          {
            titularId: '',
            tipo: 'PESO',
            valor,
            dataHora: passado,
          },
          agora,
        ),
      ).toThrow(RegraVioladaErro);
    });

    it('recusa medição cujo tipo difere do valor fornecido', () => {
      const valor = new Peso(70);
      expect(() =>
        Medicao.registrar(
          {
            titularId,
            tipo: 'PRESSAO_ARTERIAL',
            valor,
            dataHora: passado,
          },
          agora,
        ),
      ).toThrow(RegraVioladaErro);
    });

    it('altera uma medição mantendo identidade e aplicando regras', () => {
      const valorInicial = new Peso(70);
      const medicao = Medicao.registrar(
        {
          titularId,
          tipo: 'PESO',
          valor: valorInicial,
          dataHora: passado,
        },
        agora,
      );

      const novoValor = new Peso(68.5);
      const novaData = new Date('2026-11-24T11:00:00Z');
      const alterada = medicao.alterar({ valor: novoValor, dataHora: novaData }, agora);

      expect(alterada.id).toBe(medicao.id);
      expect(alterada.valor).toEqual(novoValor);
      expect(alterada.dataHora).toEqual(novaData);
    });

    it('recusa alteração de medição para data futura', () => {
      const medicao = Medicao.registrar(
        {
          titularId,
          tipo: 'PESO',
          valor: new Peso(70),
          dataHora: passado,
        },
        agora,
      );

      expect(() => medicao.alterar({ dataHora: futuro }, agora)).toThrow(RegraVioladaErro);
    });
  });
});
