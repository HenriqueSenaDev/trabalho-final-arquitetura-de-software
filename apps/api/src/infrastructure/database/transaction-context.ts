import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@personal-health/database';
import { PrismaService } from './prisma.service';

export type DatabaseClient = Prisma.TransactionClient;

/**
 * Transação corrente da requisição. Os repositórios usam `run`: dentro de
 * uma UnitOfWork, entram na transação dela; fora, abrem a própria. Assim a
 * consulta e o lembrete são gravados juntos, e cada repositório continua
 * gravando o agregado e o outbox na mesma transação.
 */
@Injectable()
export class TransactionContext {
  private readonly current = new AsyncLocalStorage<DatabaseClient>();

  constructor(private readonly prisma: PrismaService) {}

  /** Cliente para leitura: o da transação corrente, se houver. */
  get client(): DatabaseClient {
    return this.current.getStore() ?? this.prisma;
  }

  run<T>(work: (client: DatabaseClient) => Promise<T>): Promise<T> {
    const active = this.current.getStore();
    if (active) {
      return work(active);
    }
    return this.prisma.$transaction((tx) => this.current.run(tx, () => work(tx)));
  }
}
