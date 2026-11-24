import { Sessao } from '../dominio/sessao';

export abstract class RepositorioSessoes {
  abstract salvar(sessao: Sessao): Promise<void>;
  abstract buscarPorHashDoToken(tokenHash: string): Promise<Sessao | null>;
  /** Sempre por titular: a sessão de outro titular não aparece (ADR 04). */
  abstract buscar(titularId: string, id: string): Promise<Sessao | null>;
  abstract listarAtivas(titularId: string): Promise<Sessao[]>;
}
