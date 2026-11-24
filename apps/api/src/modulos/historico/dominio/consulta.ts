import { randomUUID } from 'node:crypto';
import { RegraVioladaErro } from '../../../compartilhado/dominio/erros';

export interface DadosConsulta {
  id: string;
  titularId: string;
  /** Data do acontecimento: pode ser passada ou futura (RF1.1). */
  dataHora: Date;
  especialidade: string;
  profissional: string | null;
  local: string | null;
  motivo: string | null;
  anotacoes: string | null;
  /** Retorno vinculado à consulta; sempre posterior a ela. */
  retornoEm: Date | null;
  /** Data de registro: campo distinto da data do acontecimento. */
  registradaEm: Date;
}

export interface NovaConsulta {
  /** Gerado pelo cliente quando ele quer poder repetir o pedido sem duplicar. */
  id?: string;
  titularId: string;
  dataHora: Date;
  especialidade: string;
  profissional?: string | null;
  local?: string | null;
  motivo?: string | null;
  anotacoes?: string | null;
  retornoEm?: Date | null;
}

/** Campos ausentes ficam como estão; `null` apaga um campo opcional. */
export interface CorrecaoDeConsulta {
  dataHora?: Date;
  especialidade?: string;
  profissional?: string | null;
  local?: string | null;
  motivo?: string | null;
  anotacoes?: string | null;
  retornoEm?: Date | null;
}

/**
 * Agregado Consulta (C4 nível 4 do componente Histórico): identidade,
 * titular, data e as regras que valem para qualquer forma de entrada.
 * Não conhece HTTP, banco nem framework.
 */
export class Consulta {
  private constructor(private readonly dados: DadosConsulta) {}

  static registrar(nova: NovaConsulta, agora: Date): Consulta {
    return new Consulta(
      Consulta.validar({
        id: nova.id ?? randomUUID(),
        titularId: nova.titularId,
        dataHora: nova.dataHora,
        especialidade: nova.especialidade.trim(),
        profissional: textoOpcional(nova.profissional),
        local: textoOpcional(nova.local),
        motivo: textoOpcional(nova.motivo),
        anotacoes: textoOpcional(nova.anotacoes),
        retornoEm: nova.retornoEm ?? null,
        registradaEm: agora,
      }),
    );
  }

  static restaurar(dados: DadosConsulta): Consulta {
    return new Consulta({ ...dados });
  }

  /**
   * Correção (invariantes, seção 4): mantém identidade, titular e data de
   * registro; a nova data reposiciona o item na linha do tempo.
   */
  corrigir(correcao: CorrecaoDeConsulta): Consulta {
    const dados = { ...this.dados };
    if (correcao.dataHora !== undefined) dados.dataHora = correcao.dataHora;
    if (correcao.especialidade !== undefined) dados.especialidade = correcao.especialidade.trim();
    if (correcao.profissional !== undefined) dados.profissional = textoOpcional(correcao.profissional);
    if (correcao.local !== undefined) dados.local = textoOpcional(correcao.local);
    if (correcao.motivo !== undefined) dados.motivo = textoOpcional(correcao.motivo);
    if (correcao.anotacoes !== undefined) dados.anotacoes = textoOpcional(correcao.anotacoes);
    if (correcao.retornoEm !== undefined) dados.retornoEm = correcao.retornoEm;
    return new Consulta(Consulta.validar(dados));
  }

  /**
   * Instante do aviso pedido pelo titular. Só existe aviso para consulta
   * futura e ele não pode cair no passado.
   */
  instanteDoAviso(antecedenciaMinutos: number, agora: Date): Date {
    if (!this.ehFutura(agora)) {
      throw new RegraVioladaErro('Só é possível pedir aviso para uma consulta futura.');
    }
    const instante = this.avisoCom(antecedenciaMinutos);
    if (instante.getTime() <= agora.getTime()) {
      throw new RegraVioladaErro('Com essa antecedência o aviso ficaria no passado.');
    }
    return instante;
  }

  /**
   * Remarcação sem pedido explícito de aviso: mantém a antecedência se o aviso
   * ainda couber no futuro; senão a consulta fica sem aviso (null).
   */
  avisoRemarcado(antecedenciaMinutos: number, agora: Date): Date | null {
    const instante = this.avisoCom(antecedenciaMinutos);
    return this.ehFutura(agora) && instante.getTime() > agora.getTime() ? instante : null;
  }

  /** Quantos minutos antes desta consulta cai o instante informado. */
  antecedenciaDe(instante: Date): number {
    return Math.round((this.dados.dataHora.getTime() - instante.getTime()) / 60_000);
  }

  get id(): string {
    return this.dados.id;
  }

  get titularId(): string {
    return this.dados.titularId;
  }

  get dataHora(): Date {
    return this.dados.dataHora;
  }

  paraLeitura(): DadosConsulta {
    return { ...this.dados };
  }

  private ehFutura(agora: Date): boolean {
    return this.dados.dataHora.getTime() > agora.getTime();
  }

  private avisoCom(antecedenciaMinutos: number): Date {
    return new Date(this.dados.dataHora.getTime() - antecedenciaMinutos * 60_000);
  }

  private static validar(dados: DadosConsulta): DadosConsulta {
    if (!dados.especialidade) {
      throw new RegraVioladaErro('Informe a especialidade da consulta.');
    }
    if (dados.retornoEm && dados.retornoEm.getTime() <= dados.dataHora.getTime()) {
      throw new RegraVioladaErro('O retorno precisa ser posterior à consulta.');
    }
    return dados;
  }
}

function textoOpcional(valor: string | null | undefined): string | null {
  const texto = valor?.trim();
  return texto ? texto : null;
}
