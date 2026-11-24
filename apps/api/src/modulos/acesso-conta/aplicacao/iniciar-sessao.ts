import { CredenciaisInvalidasErro } from '../../../compartilhado/dominio/erros';
import { Relogio } from '../../../compartilhado/portas/relogio';
import { Sessao } from '../dominio/sessao';
import { RepositorioSessoes } from '../portas/repositorio-sessoes';
import { RepositorioTitulares } from '../portas/repositorio-titulares';
import { VerificadorDeSenha } from '../portas/verificador-de-senha';

export interface ComandoIniciarSessao {
  email: string;
  senha: string;
  dispositivo?: string;
  tokenEntrega?: string;
}

export interface SessaoIniciada {
  token: string;
  /** Para o aplicativo encerrar esta sessão (DELETE /sessoes/:id). */
  sessaoId: string;
  titular: { id: string; nome: string };
}

/** Caso de uso (porta de entrada): autentica o titular em um aparelho. */
export class IniciarSessao {
  constructor(
    private readonly titulares: RepositorioTitulares,
    private readonly sessoes: RepositorioSessoes,
    private readonly senhas: VerificadorDeSenha,
    private readonly relogio: Relogio,
  ) {}

  async executar(comando: ComandoIniciarSessao): Promise<SessaoIniciada> {
    const titular = await this.titulares.buscarPorEmail(comando.email.trim().toLowerCase());
    const senhaConfere = titular
      ? await this.senhas.confere(comando.senha, titular.senhaHash)
      : false;
    if (!titular || !senhaConfere) {
      throw new CredenciaisInvalidasErro();
    }

    const { sessao, token } = Sessao.iniciar(
      {
        titularId: titular.id,
        dispositivo: comando.dispositivo?.trim() || 'desconhecido',
        tokenEntrega: comando.tokenEntrega?.trim() || null,
      },
      this.relogio.agora(),
    );
    await this.sessoes.salvar(sessao);

    return { token, sessaoId: sessao.id, titular: { id: titular.id, nome: titular.nome } };
  }
}
