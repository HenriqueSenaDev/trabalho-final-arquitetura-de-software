import { PrismaClient } from '@personal-health/database';

interface EventoPendente {
  id: string;
  tipo: string;
  origem_id: string;
  versao: number;
}

export class PrismaRelayOutbox {
  constructor(private readonly prisma: PrismaClient) {}

  executar(limite: number): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const eventos = await tx.$queryRaw<EventoPendente[]>`
        SELECT id, tipo, origem_id, versao FROM eventos_outbox
        WHERE processado_em IS NULL AND tipo IN ('ReminderChanged', 'ReminderCancelled')
        ORDER BY criado_em, id LIMIT ${limite} FOR UPDATE SKIP LOCKED
      `;
      for (const evento of eventos) {
        await tx.$executeRaw`UPDATE eventos_outbox SET processado_em = now() WHERE id = ${evento.id}::uuid`;
      }
      return eventos.length;
    });
  }
}
