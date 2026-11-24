import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../core/application/unit-of-work.port';
import { TransactionContext } from './transaction-context';

@Injectable()
export class PrismaUnitOfWork extends UnitOfWork {
  constructor(private readonly transactions: TransactionContext) {
    super();
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.transactions.run(() => work());
  }
}
