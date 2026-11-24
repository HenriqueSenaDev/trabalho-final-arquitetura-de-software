import { Injectable } from '@nestjs/common';
import { UnidadeDeTrabalho } from '../portas/unidade-de-trabalho';
import { ContextoPrisma } from './contexto-prisma';

/** Adaptador da UnidadeDeTrabalho: uma transação do PostgreSQL. */
@Injectable()
export class PrismaUnidadeDeTrabalho extends UnidadeDeTrabalho {
  constructor(private readonly contexto: ContextoPrisma) {
    super();
  }

  executar<T>(trabalho: () => Promise<T>): Promise<T> {
    return this.contexto.emTransacao(trabalho);
  }
}
