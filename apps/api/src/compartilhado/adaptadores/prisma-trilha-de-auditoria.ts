import { Injectable } from '@nestjs/common';
import { EntradaDeAuditoria, TrilhaDeAuditoria } from '../portas/trilha-de-auditoria';
import { PrismaService } from './prisma.service';

/**
 * Grava fora da transação do caso de uso: uma operação recusada e desfeita
 * continua registrada na trilha.
 */
@Injectable()
export class PrismaTrilhaDeAuditoria extends TrilhaDeAuditoria {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async registrar(entrada: EntradaDeAuditoria): Promise<void> {
    await this.prisma.registroAuditoria.create({ data: entrada });
  }
}
