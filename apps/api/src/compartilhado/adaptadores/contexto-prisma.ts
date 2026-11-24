import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@personal-health/database';
import { PrismaService } from './prisma.service';

export type ClientePrisma = Prisma.TransactionClient;

/**
 * Entrega aos adaptadores de persistência o cliente certo: a transação aberta
 * pela unidade de trabalho, quando existe, ou a conexão comum. Assim os
 * repositórios de módulos diferentes participam da mesma transação sem
 * conhecer uns aos outros.
 */
@Injectable()
export class ContextoPrisma {
  private readonly transacaoAtual = new AsyncLocalStorage<ClientePrisma>();

  constructor(private readonly prisma: PrismaService) {}

  get cliente(): ClientePrisma {
    return this.transacaoAtual.getStore() ?? this.prisma;
  }

  emTransacao<T>(trabalho: () => Promise<T>): Promise<T> {
    if (this.transacaoAtual.getStore()) {
      return trabalho();
    }
    return this.prisma.$transaction((transacao) =>
      this.transacaoAtual.run(transacao, trabalho),
    );
  }
}
