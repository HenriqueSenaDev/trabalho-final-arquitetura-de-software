import { EventoDaOutbox, RepositorioOutbox } from '../portas/eventos';
import { RepositorioOcorrencias } from '../portas/ocorrencias';
import { OcorrenciaDose } from '../dominio/ocorrencia-de-dose';

export class OutboxDeTratamentosIndisponivel implements RepositorioOutbox {
  async salvar(_evento: EventoDaOutbox): Promise<void> {
    throw new Error('Operação ainda não disponível.');
  }

  async reservarPendentes(_limite: number): Promise<EventoDaOutbox[]> {
    throw new Error('Operação ainda não disponível.');
  }

  async marcarProcessado(_id: string): Promise<void> {
    throw new Error('Operação ainda não disponível.');
  }

  async registrarFalha(_id: string): Promise<void> {
    throw new Error('Operação ainda não disponível.');
  }
}

export class OcorrenciasDeTratamentoIndisponiveis implements RepositorioOcorrencias {
  async listarPorTratamento(_id: string): Promise<OcorrenciaDose[]> {
    throw new Error('Operação ainda não disponível.');
  }

  async salvar(_ocorrencia: OcorrenciaDose): Promise<void> {
    throw new Error('Operação ainda não disponível.');
  }

  async cancelarOcorrenciasFuturas(_id: string): Promise<void> {
    throw new Error('Operação ainda não disponível.');
  }
}
