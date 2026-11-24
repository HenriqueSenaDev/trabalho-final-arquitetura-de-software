import { Injectable } from '@nestjs/common';
import { ContextoPrisma } from '../../../../compartilhado/adaptadores/contexto-prisma';
import { FuncionalidadeIndisponivelErro } from '../../../../compartilhado/dominio/erros';
import { EventoLembretes } from '../../contrato';
import { PublicadorEventos, RepositorioOutbox } from '../../portas/eventos';

@Injectable()
export class PrismaRepositorioOutbox extends RepositorioOutbox {
  constructor(private readonly contexto: ContextoPrisma) {
    super();
  }

  async salvar(evento: EventoLembretes): Promise<void> {
    await this.contexto.cliente
      .$executeRaw`INSERT INTO eventos_outbox (id, tipo, origem_id, titular_id, versao, criado_em)
      VALUES (${evento.id}::uuid, ${evento.tipo}, ${evento.origemId}::uuid, ${evento.titularId}::uuid, ${evento.versao}, ${evento.ocorridoEm})`;
  }

  async reservarPendentes(_limite: number): Promise<EventoLembretes[]> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async marcarProcessado(_id: string): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async registrarFalha(_id: string): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }
}

export class PublicadorEventosOutbox extends PublicadorEventos {
  constructor(private readonly outbox: RepositorioOutbox) {
    super();
  }

  publicar(evento: EventoLembretes): Promise<void> {
    return this.outbox.salvar(evento);
  }
}
