import { Lembrete } from '../dominio/lembrete';

export abstract class RepositorioLembretes {
  abstract salvar(lembrete: Lembrete): Promise<void>;

  abstract buscarPorId(id: string, titularId: string): Promise<Lembrete | null>;

  abstract buscarPorOrigem(origemId: string, titularId: string): Promise<Lembrete | null>;
}
