const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? 'http://localhost:3000';
const TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Cliente HTTPS da API de Saúde. O aplicativo só confirma uma operação
 * depois da resposta do servidor e avisa quando a conexão a impede.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(errorMessage(body), response.status);
  }
  return body as T;
}

/** A API manda uma mensagem ou, nos erros de formato, uma por campo. */
function errorMessage(body: unknown): string {
  const message =
    typeof body === 'object' && body !== null && 'message' in body
      ? (body as { message: unknown }).message
      : null;
  if (Array.isArray(message)) return message.join('\n');
  if (typeof message === 'string') return message;
  return 'Algo deu errado. Tente novamente.';
}
