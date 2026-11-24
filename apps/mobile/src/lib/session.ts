export interface AppSession {
  token: string;
  /** Para encerrar esta sessão no servidor ao sair. */
  sessionId: string;
  holder: { id: string; fullName: string; email: string };
}

/**
 * Sessão em memória. O servidor é a cópia de referência: o aplicativo não
 * guarda dados de saúde no aparelho.
 */
let current: AppSession | null = null;

export const session = {
  current: () => current,
  start: (next: AppSession) => {
    current = next;
  },
  end: () => {
    current = null;
  },
};
