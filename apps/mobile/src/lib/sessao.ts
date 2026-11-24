export interface SessaoDoAplicativo {
  token: string;
  /** Identificador da sessão no servidor, para encerrá-la ao sair. */
  sessaoId: string;
  titular: { id: string; nome: string };
}

/**
 * Sessão em memória. O servidor é a cópia de referência (seção 2 do
 * documento): o aplicativo não guarda dados de saúde localmente.
 */
let atual: SessaoDoAplicativo | null = null;

export const sessao = {
  atual: () => atual,
  iniciar: (nova: SessaoDoAplicativo) => {
    atual = nova;
  },
  encerrar: () => {
    atual = null;
  },
};
