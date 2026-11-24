import { createHash, randomBytes, randomUUID } from 'node:crypto';

export interface SessionProps {
  id: string;
  holderId: string;
  tokenHash: string;
  device: string;
  /** Token do aparelho no provedor de notificações. */
  deliveryToken: string | null;
  createdAt: Date;
  revokedAt: Date | null;
}

/**
 * Sessão por aparelho (ADR 04). O token só existe na resposta do login; o
 * servidor guarda o hash. Revogar invalida o token e desassocia o destino de
 * notificações, então o aparelho perdido para de receber avisos.
 */
export class Session {
  private constructor(private readonly props: SessionProps) {}

  static open(
    input: { holderId: string; device?: string | null; deliveryToken?: string | null },
    now = new Date(),
  ): { session: Session; token: string } {
    const token = randomBytes(32).toString('base64url');
    const session = new Session({
      id: randomUUID(),
      holderId: input.holderId,
      tokenHash: Session.hashToken(token),
      device: input.device?.trim() || 'desconhecido',
      deliveryToken: input.deliveryToken?.trim() || null,
      createdAt: now,
      revokedAt: null,
    });
    return { session, token };
  }

  static restore(props: SessionProps): Session {
    return new Session({ ...props });
  }

  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  isActive(): boolean {
    return this.props.revokedAt === null;
  }

  revoke(now = new Date()): void {
    if (!this.isActive()) {
      return;
    }
    this.props.revokedAt = now;
    this.props.deliveryToken = null;
  }

  belongsTo(holderId: string): boolean {
    return this.props.holderId === holderId;
  }

  get id(): string {
    return this.props.id;
  }

  get holderId(): string {
    return this.props.holderId;
  }

  toSnapshot(): SessionProps {
    return { ...this.props };
  }
}
