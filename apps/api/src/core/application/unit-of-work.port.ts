/**
 * Porta de transação. Tudo o que os repositórios gravarem dentro de `run`
 * é confirmado junto ou desfeito junto, mesmo entre módulos (por exemplo, a
 * consulta e o lembrete dela).
 */
export abstract class UnitOfWork {
  abstract run<T>(work: () => Promise<T>): Promise<T>;
}
