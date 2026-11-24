import { Injectable } from '@nestjs/common';
import { Session as SessionRow } from '@personal-health/database';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(session: Session): Promise<void> {
    const { id, ...data } = session.toSnapshot();
    await this.prisma.session.upsert({
      where: { id },
      create: { id, ...data },
      update: { revokedAt: data.revokedAt, deliveryToken: data.deliveryToken },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const row = await this.prisma.session.findUnique({ where: { tokenHash } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<Session | null> {
    const row = await this.prisma.session.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async listActiveByHolder(holderId: string): Promise<Session[]> {
    const rows = await this.prisma.session.findMany({
      where: { holderId, revokedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: SessionRow): Session {
    return Session.restore({
      id: row.id,
      holderId: row.holderId,
      tokenHash: row.tokenHash,
      device: row.device,
      deliveryToken: row.deliveryToken,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
    });
  }
}
