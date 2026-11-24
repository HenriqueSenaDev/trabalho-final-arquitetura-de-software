import { PrismaClient } from '@personal-health/database';
import { AgendamentoReservado, RepositorioDeAgendamentos } from '../portas/agendamentos';

interface LinhaReservada {
  id: string;
  titular_id: string;
  versao: number;
  tentativas: number;
  reserva: string;
}

/**
 * Adaptador relacional dos agendamentos. As colunas são `timestamp` em UTC,
 * por isso o relógio usado é sempre `timezone('utc', now())` do próprio banco:
 * todas as réplicas comparam com o mesmo relógio.
 *
 * Toda escrita exige a versão e a reserva vistas na reserva: se o titular
 * reagendou (a API zera a reserva) ou se outra réplica assumiu depois do
 * prazo, a escrita não acontece.
 */
export class PrismaAgendamentos implements RepositorioDeAgendamentos {
  constructor(private readonly prisma: PrismaClient) {}

  async reservarDevidos(limite: number, reservaSegundos: number): Promise<AgendamentoReservado[]> {
    // FOR UPDATE SKIP LOCKED: réplicas em paralelo nunca reservam o mesmo agendamento.
    const linhas = await this.prisma.$queryRaw<LinhaReservada[]>`
      UPDATE agendamentos AS a
         SET reservado_ate = timezone('utc', now()) + make_interval(secs => ${reservaSegundos}::int),
             reserva       = gen_random_uuid(),
             tentativas    = a.tentativas + 1,
             atualizado_em = timezone('utc', now())
        FROM (
              SELECT id
                FROM agendamentos
               WHERE estado = 'PENDENTE'
                 AND instante <= timezone('utc', now())
                 AND (reservado_ate IS NULL OR reservado_ate <= timezone('utc', now()))
               ORDER BY instante, id
               LIMIT ${limite}::int
                 FOR UPDATE SKIP LOCKED
             ) AS devidos
       WHERE a.id = devidos.id
   RETURNING a.id, a.titular_id, a.versao, a.tentativas, a.reserva
    `;
    return linhas.map((linha) => ({
      id: linha.id,
      titularId: linha.titular_id,
      versao: Number(linha.versao),
      tentativas: Number(linha.tentativas),
      reserva: linha.reserva,
    }));
  }

  async renovarReserva(reservado: AgendamentoReservado, reservaSegundos: number): Promise<boolean> {
    const alterados = await this.prisma.$executeRaw`
      UPDATE agendamentos
         SET reservado_ate = timezone('utc', now()) + make_interval(secs => ${reservaSegundos}::int),
             atualizado_em = timezone('utc', now())
       WHERE id = ${reservado.id}::uuid
         AND versao = ${reservado.versao}::int
         AND estado = 'PENDENTE'
         AND reserva = ${reservado.reserva}::uuid
         AND reservado_ate > timezone('utc', now())
    `;
    return alterados === 1;
  }

  async concluir(reservado: AgendamentoReservado): Promise<boolean> {
    const alterados = await this.prisma.$executeRaw`
      UPDATE agendamentos
         SET estado        = 'ENVIADO',
             enviado_em    = timezone('utc', now()),
             reservado_ate = NULL,
             reserva       = NULL,
             ultimo_erro   = NULL,
             atualizado_em = timezone('utc', now())
       WHERE id = ${reservado.id}::uuid
         AND versao = ${reservado.versao}::int
         AND estado = 'PENDENTE'
         AND reserva = ${reservado.reserva}::uuid
    `;
    return alterados === 1;
  }

  async adiar(reservado: AgendamentoReservado, erro: string, esperaSegundos: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE agendamentos
         SET reservado_ate = timezone('utc', now()) + make_interval(secs => ${esperaSegundos}::int),
             reserva       = NULL,
             ultimo_erro   = ${erro},
             atualizado_em = timezone('utc', now())
       WHERE id = ${reservado.id}::uuid
         AND versao = ${reservado.versao}::int
         AND estado = 'PENDENTE'
         AND reserva = ${reservado.reserva}::uuid
    `;
  }

  async falhar(reservado: AgendamentoReservado, erro: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE agendamentos
         SET estado        = 'FALHOU',
             reservado_ate = NULL,
             reserva       = NULL,
             ultimo_erro   = ${erro},
             atualizado_em = timezone('utc', now())
       WHERE id = ${reservado.id}::uuid
         AND versao = ${reservado.versao}::int
         AND estado = 'PENDENTE'
         AND reserva = ${reservado.reserva}::uuid
    `;
  }
}
