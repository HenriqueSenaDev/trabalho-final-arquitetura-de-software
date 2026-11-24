import { Injectable } from '@nestjs/common';
import { Prisma } from '@personal-health/database';
import { ContextoPrisma } from '../../../../compartilhado/adaptadores/contexto-prisma';
import { ConflitoErro } from '../../../../compartilhado/dominio/erros';
import { Agendamento } from '../../dominio/agendamento';
import { RepositorioAgendamentos } from '../../portas/repositorio-agendamentos';

const MUDOU_NO_MEIO_TEMPO = 'O aviso foi alterado por outra operação. Tente de novo.';

@Injectable()
export class PrismaRepositorioAgendamentos extends RepositorioAgendamentos {
  constructor(private readonly contexto: ContextoPrisma) {
    super();
  }

  async buscarPorOrigem(
    titularId: string,
    origem: { tipo: 'CONSULTA'; id: string },
  ): Promise<Agendamento | null> {
    const linha = await this.contexto.cliente.agendamento.findFirst({
      where: { titularId, origemTipo: origem.tipo, origemId: origem.id },
    });
    if (!linha) {
      return null;
    }
    return Agendamento.restaurar({
      id: linha.id,
      titularId: linha.titularId,
      origem: { tipo: 'CONSULTA', id: linha.origemId },
      instante: linha.instante,
      estado: linha.estado,
      versao: linha.versao,
    });
  }

  async salvar(agendamento: Agendamento): Promise<void> {
    const { origem, ...dados } = agendamento.paraGravacao();

    if (agendamento.versaoLida === null) {
      try {
        await this.contexto.cliente.agendamento.create({
          data: { ...dados, origemTipo: origem.tipo, origemId: origem.id },
        });
      } catch (erro) {
        // Duas operações criaram o aviso da mesma consulta ao mesmo tempo.
        if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
          throw new ConflitoErro(MUDOU_NO_MEIO_TEMPO);
        }
        throw erro;
      }
      return;
    }

    // Nova versão: zera o que o processador anotou na versão anterior, e a
    // reserva que ele estiver segurando deixa de valer.
    const { count } = await this.contexto.cliente.agendamento.updateMany({
      where: { id: dados.id, versao: agendamento.versaoLida },
      data: {
        instante: dados.instante,
        estado: dados.estado,
        versao: dados.versao,
        reserva: null,
        reservadoAte: null,
        ...(dados.estado === 'PENDENTE'
          ? { tentativas: 0, ultimoErro: null, enviadoEm: null }
          : {}),
      },
    });
    if (count !== 1) {
      throw new ConflitoErro(MUDOU_NO_MEIO_TEMPO);
    }
  }
}
