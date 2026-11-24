import { randomUUID } from 'node:crypto';
import { RegraVioladaErro } from '../../../compartilhado/dominio/erros';

export type EstadoAgendamento = 'PENDENTE' | 'ENVIADO' | 'CANCELADO' | 'FALHOU';

export interface DadosAgendamento {
  id: string;
  titularId: string;
  origem: { tipo: 'CONSULTA'; id: string };
  instante: Date;
  estado: EstadoAgendamento;
  versao: number;
  tentativas?: number;
  reserva?: string | null;
}

/**
 * Agendamento durável de um aviso (ADR 03). Guarda origem, titular, instante,
 * estado e versão. Reagendar ou cancelar gera uma nova versão; o processador
 * só entrega a versão que reservou se ela ainda for a vigente.
 */
export class Agendamento {
  private constructor(
    private dados: DadosAgendamento,
    /** Versão carregada do banco; null para um agendamento novo. */
    readonly versaoLida: number | null,
  ) {}

  static paraConsulta(
    pedido: { titularId: string; consultaId: string; instante: Date },
    agora: Date,
  ): Agendamento {
    exigirFuturo(pedido.instante, agora);
    return new Agendamento(
      {
        id: randomUUID(),
        titularId: pedido.titularId,
        origem: { tipo: 'CONSULTA', id: pedido.consultaId },
        instante: pedido.instante,
        estado: 'PENDENTE',
        versao: 1,
      },
      null,
    );
  }

  static restaurar(dados: DadosAgendamento): Agendamento {
    return new Agendamento({ ...dados, origem: { ...dados.origem } }, dados.versao);
  }

  /** Nova versão pendente no novo instante. Vale também para aviso já enviado ou cancelado. */
  reagendar(instante: Date, agora: Date): void {
    exigirFuturo(instante, agora);
    this.dados = { ...this.dados, instante, estado: 'PENDENTE', versao: this.dados.versao + 1 };
  }

  /** Cancela só o que ainda não saiu. Devolve false se não havia nada pendente. */
  cancelar(): boolean {
    if (this.dados.estado !== 'PENDENTE') {
      return false;
    }
    this.dados = { ...this.dados, estado: 'CANCELADO', versao: this.dados.versao + 1 };
    return true;
  }

  registrarEntrega(): void {
    throw new Error('Registro de entrega pertence ao processador de lembretes.');
  }

  registrarFalha(_motivo: string): void {
    throw new Error('Registro de falha pertence ao processador de lembretes.');
  }

  get estado(): EstadoAgendamento {
    return this.dados.estado;
  }

  paraGravacao(): DadosAgendamento {
    return { ...this.dados, origem: { ...this.dados.origem } };
  }
}

function exigirFuturo(instante: Date, agora: Date): void {
  if (instante.getTime() <= agora.getTime()) {
    throw new RegraVioladaErro('O aviso precisa ser agendado para o futuro.');
  }
}
