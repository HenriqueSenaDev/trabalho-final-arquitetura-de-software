import { Titular } from '../dominio/titular';

export abstract class RepositorioTitulares {
  abstract buscarPorEmail(email: string): Promise<Titular | null>;
}
