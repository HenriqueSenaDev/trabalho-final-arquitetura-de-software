import { OcorrenciaDeDose } from '../dominio/ocorrencia-de-dose';

export abstract class RepositorioOcorrencias {
  abstract salvar(ocorrencia: OcorrenciaDeDose): Promise<void>;

  abstract buscarPorId(id: string, titularId: string): Promise<OcorrenciaDeDose | null>;

  abstract listarPorTratamento(tratamentoId: string): Promise<OcorrenciaDeDose[]>;

  abstract cancelarOcorrenciasFuturas(tratamentoId: string): Promise<void>;
}
