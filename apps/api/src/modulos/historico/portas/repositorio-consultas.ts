import { Consulta } from '../dominio/consulta';

/**
 * Porta de saída RepositorioConsultas (C4 nível 4): grava e carrega o
 * agregado sempre por titular e identificador, o que faz da autorização por
 * objeto (ADR 04) uma propriedade da própria consulta ao banco.
 */
export abstract class RepositorioConsultas {
  /** Insere a consulta nova. Devolve false se o identificador já existe. */
  abstract inserir(consulta: Consulta): Promise<boolean>;

  /** Grava a correção de uma consulta existente. */
  abstract salvar(consulta: Consulta): Promise<void>;

  abstract buscar(titularId: string, id: string): Promise<Consulta | null>;

  /** Remove a consulta (e o retorno, que vive nela). Devolve false se não era do titular. */
  abstract excluir(titularId: string, id: string): Promise<boolean>;
}
