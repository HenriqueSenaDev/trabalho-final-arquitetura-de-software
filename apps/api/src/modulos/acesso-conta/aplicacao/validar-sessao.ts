import { ContratoAcessoConta, IdentidadeAutenticada } from '../contrato';
import { Sessao } from '../dominio/sessao';
import { RepositorioSessoes } from '../portas/repositorio-sessoes';

/** Caso de uso que implementa o contrato público do módulo. */
export class ValidarSessao extends ContratoAcessoConta {
  constructor(private readonly sessoes: RepositorioSessoes) {
    super();
  }

  async validarSessao(token: string): Promise<IdentidadeAutenticada | null> {
    const sessao = await this.sessoes.buscarPorHashDoToken(Sessao.hashDoToken(token));
    if (!sessao || !sessao.estaAtiva()) {
      return null;
    }
    return { titularId: sessao.titularId, sessaoId: sessao.id };
  }
}
