import { Injectable } from '@nestjs/common';
import { AuditEntry, AuditTrail } from '../../core/application/audit-trail.port';
import { PrismaService } from '../database/prisma.service';

/** Grava fora da transação da requisição: a tentativa negada também fica registrada. */
@Injectable()
export class PrismaAuditTrail extends AuditTrail {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({ data: entry });
  }
}
