const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Cliente HTTPS da API de Saúde. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
      0,
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : 'Algo deu errado. Tente novamente.';
    throw new ApiError(message, response.status);
  }
  return body as T;
}
