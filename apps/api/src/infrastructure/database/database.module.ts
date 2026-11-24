import { Global, Module } from '@nestjs/common';
import { AuditTrail } from '../../core/application/audit-trail.port';
import { UnitOfWork } from '../../core/application/unit-of-work.port';
import { PrismaAuditTrail } from '../audit/prisma-audit-trail';
import { PrismaService } from './prisma.service';
import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { TransactionContext } from './transaction-context';

@Global()
@Module({
  providers: [
    PrismaService,
    TransactionContext,
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
    { provide: AuditTrail, useClass: PrismaAuditTrail },
  ],
  exports: [PrismaService, TransactionContext, UnitOfWork, AuditTrail],
})
export class DatabaseModule {}
