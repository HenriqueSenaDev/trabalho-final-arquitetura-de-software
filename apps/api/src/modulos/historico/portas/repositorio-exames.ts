import { Exame } from '../dominio/exame';

export abstract class RepositorioExames {
  abstract salvar(exame: Exame): Promise<void>;
  abstract buscarPorId(id: string, titularId: string): Promise<Exame | null>;
  abstract listarPorTitular(titularId: string): Promise<Exame[]>;
  abstract excluir(id: string, titularId: string): Promise<void>;
}
