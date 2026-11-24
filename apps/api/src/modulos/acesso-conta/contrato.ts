/**
 * Contrato público do módulo Acesso à Conta. É o único arquivo do módulo que
 * outros componentes da API podem importar (regra verificada em
 * test/unidade/arquitetura.spec.ts).
 */
export interface IdentidadeAutenticada {
  titularId: string;
  sessaoId: string;
}

export abstract class ContratoAcessoConta {
  /** Resolve a identidade a partir do token; null se não existe ou foi revogado. */
  abstract validarSessao(token: string): Promise<IdentidadeAutenticada | null>;
}
