import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Holder } from '../domain/holder';
import { HolderRepository } from '../domain/holder.repository';

@Injectable()
export class PrismaHolderRepository extends HolderRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(holder: Holder): Promise<void> {
    const { passwordHash, ...data } = holder.toSnapshot();
    await this.prisma.holder.create({ data: { ...data, password: passwordHash } });
  }

  async findById(id: string): Promise<Holder | null> {
    const row = await this.prisma.holder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) {
      return null;
    }
    return Holder.restore({
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      passwordHash: row.password,
      createdAt: row.createdAt,
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.holder.count({ where: { email } });
    return count > 0;
  }
}
