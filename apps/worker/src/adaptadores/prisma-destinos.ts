import { PrismaClient } from '@personal-health/database';
import { DestinosDeNotificacao } from '../portas/destinos';

/**
 * Lê a view `destinos_notificacao`, o contrato de leitura que o módulo
 * Acesso à Conta publica no banco. O processador não conhece a tabela de
 * sessões.
 */
export class PrismaDestinos implements DestinosDeNotificacao {
  constructor(private readonly prisma: PrismaClient) {}

  async ativosDoTitular(titularId: string): Promise<string[]> {
    const linhas = await this.prisma.$queryRaw<{ token_entrega: string }[]>`
      SELECT token_entrega FROM destinos_notificacao WHERE titular_id = ${titularId}::uuid
    `;
    return [...new Set(linhas.map((linha) => linha.token_entrega))];
  }
}
