import { RespostaDose } from '../dominio/resposta-dose';

export abstract class RepositorioRespostasDose {
  abstract salvar(resposta: RespostaDose): Promise<void>;

  abstract buscarPorOcorrencia(ocorrenciaId: string): Promise<RespostaDose | null>;
}
