/**
 * Porta de saída: executa um trabalho de forma atômica. Tudo que os
 * repositórios gravarem dentro de `executar` é confirmado junto ou desfeito
 * junto, mesmo quando envolve mais de um módulo.
 */
export abstract class UnidadeDeTrabalho {
  abstract executar<T>(trabalho: () => Promise<T>): Promise<T>;
}
