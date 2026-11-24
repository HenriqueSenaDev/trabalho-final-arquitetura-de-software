import { Tratamento } from '../dominio/tratamento';

export abstract class RepositorioTratamentos {
  abstract salvar(tratamento: Tratamento): Promise<void>;
  abstract buscarPorId(id: string, titularId: string): Promise<Tratamento | null>;
  abstract listarPorTitular(titularId: string): Promise<Tratamento[]>;
}
