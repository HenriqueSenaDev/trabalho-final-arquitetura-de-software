import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { Relogio } from '../../../compartilhado/portas/relogio';
import { IdentidadeAutenticada } from '../contrato';
import { RepositorioSessoes } from '../portas/repositorio-sessoes';

export interface SessaoAtiva {
  id: string;
  dispositivo: string;
  criadaEm: Date;
  /** É a sessão que fez esta requisição. */
  atual: boolean;
}

/** Caso de uso: aparelhos com sessão ativa do titular, para escolher qual revogar. */
export class ListarSessoes {
  constructor(private readonly sessoes: RepositorioSessoes) {}

  async executar(identidade: IdentidadeAutenticada): Promise<SessaoAtiva[]> {
    const ativas = await this.sessoes.listarAtivas(identidade.titularId);
    return ativas.map((sessao) => ({
      id: sessao.id,
      dispositivo: sessao.dispositivo,
      criadaEm: sessao.criadaEm,
      atual: sessao.id === identidade.sessaoId,
    }));
  }
}

/**
 * Caso de uso RevogarSessao (ADR 04): encerra a própria sessão (sair) ou a de
 * um aparelho perdido. O token revogado deixa de autorizar na próxima
 * requisição e o aparelho sai dos destinos de notificação.
 */
export class RevogarSessao {
  constructor(
    private readonly sessoes: RepositorioSessoes,
    private readonly relogio: Relogio,
  ) {}

  async executar(pedido: { titularId: string; sessaoId: string }): Promise<void> {
    const sessao = await this.sessoes.buscar(pedido.titularId, pedido.sessaoId);
    if (!sessao) {
      throw new RecursoIndisponivelErro();
    }
    sessao.revogar(this.relogio.agora());
    await this.sessoes.salvar(sessao);
  }
}
