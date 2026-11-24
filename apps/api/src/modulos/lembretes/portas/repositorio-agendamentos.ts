import { Agendamento } from '../dominio/agendamento';

export abstract class RepositorioAgendamentos {
  /** Sempre por titular: outro titular não enxerga nem altera o agendamento (ADR 04). */
  abstract buscarPorOrigem(
    titularId: string,
    origem: { tipo: 'CONSULTA'; id: string },
  ): Promise<Agendamento | null>;

  /**
   * Cria o agendamento novo ou grava a nova versão. A gravação de uma versão
   * só acontece se a versão lida ainda for a do banco; senão lança ConflitoErro.
   */
  abstract salvar(agendamento: Agendamento): Promise<void>;
}
