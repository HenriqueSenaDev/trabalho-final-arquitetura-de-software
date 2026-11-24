const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? 'http://localhost:3000';
const TEMPO_LIMITE_MS = 15_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  corpo?: unknown;
  token?: string;
}

/**
 * Cliente HTTPS da API de Saúde. O aplicativo só confirma uma operação
 * depois da resposta do servidor e avisa quando a conexão a impede.
 */
export async function request<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}${caminho}`, {
      method: opcoes.metodo ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}),
      },
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      signal: controle.signal,
    });
  } catch {
    throw new ApiError(
      'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.',
      0,
    );
  } finally {
    clearTimeout(limite);
  }

  if (resposta.status === 204) {
    return undefined as T;
  }
  const corpo: unknown = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new ApiError(mensagemDeErro(corpo), resposta.status);
  }
  return corpo as T;
}

function mensagemDeErro(corpo: unknown): string {
  const mensagem = (corpo as { message?: unknown } | null)?.message;
  if (Array.isArray(mensagem)) return mensagem.join('\n');
  if (typeof mensagem === 'string') return mensagem;
  return 'Algo deu errado. Tente de novo.';
}
