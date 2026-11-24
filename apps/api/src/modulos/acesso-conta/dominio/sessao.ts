import { createHash, randomBytes, randomUUID } from 'node:crypto';

export interface DadosSessao {
  id: string;
  titularId: string;
  tokenHash: string;
  dispositivo: string;
  tokenEntrega: string | null;
  criadaEm: Date;
  revogadaEm: Date | null;
}

/**
 * Sessão de um aparelho. O servidor guarda só o hash do token, e revogar a
 * sessão invalida o acesso e o destino de notificações do aparelho (ADR 04).
 */
export class Sessao {
  private constructor(private readonly dados: DadosSessao) {}

  static iniciar(
    pedido: { titularId: string; dispositivo: string; tokenEntrega: string | null },
    agora: Date,
  ): { sessao: Sessao; token: string } {
    const token = randomBytes(32).toString('base64url');
    const sessao = new Sessao({
      id: randomUUID(),
      titularId: pedido.titularId,
      tokenHash: Sessao.hashDoToken(token),
      dispositivo: pedido.dispositivo,
      tokenEntrega: pedido.tokenEntrega,
      criadaEm: agora,
      revogadaEm: null,
    });
    return { sessao, token };
  }

  static restaurar(dados: DadosSessao): Sessao {
    return new Sessao({ ...dados });
  }

  static hashDoToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  estaAtiva(): boolean {
    return this.dados.revogadaEm === null;
  }

  /**
   * Revoga a sessão (logout ou aparelho perdido): o token deixa de autorizar
   * e o destino de notificações é desassociado (ADR 04).
   */
  revogar(agora: Date): void {
    if (!this.estaAtiva()) {
      return;
    }
    this.dados.revogadaEm = agora;
    this.dados.tokenEntrega = null;
  }

  get id(): string {
    return this.dados.id;
  }

  get titularId(): string {
    return this.dados.titularId;
  }

  get dispositivo(): string {
    return this.dados.dispositivo;
  }

  get criadaEm(): Date {
    return this.dados.criadaEm;
  }

  paraGravacao(): DadosSessao {
    return { ...this.dados };
  }
}
