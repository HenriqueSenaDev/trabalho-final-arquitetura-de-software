import { OcorrenciaDose } from '../dominio/ocorrencia-de-dose';

export interface RepositorioOcorrencias {
  listarPorTratamento(tratamentoId: string): Promise<OcorrenciaDose[]>;
  salvar(ocorrencia: OcorrenciaDose): Promise<void>;
  cancelarOcorrenciasFuturas(tratamentoId: string): Promise<void>;
}
