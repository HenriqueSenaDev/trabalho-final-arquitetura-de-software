import { Injectable } from '@nestjs/common';
import { ContextoPrisma } from '../../../../compartilhado/adaptadores/contexto-prisma';
import { FuncionalidadeIndisponivelErro } from '../../../../compartilhado/dominio/erros';
import { Medicao } from '../../dominio/medicao';
import { FiltrosMedicao, RepositorioMedicoes } from '../../portas/repositorio-medicoes';

/**
 * Adaptador relacional que implementa a porta RepositorioMedicoes via Prisma (ADR 05).
 * Como funcionalidade secundária do modelo arquitetural C3/C4, declara as
 * dependências reais e assinaturas esperadas, lançando exceção de funcionalidade
 * indisponível (HTTP 503) nos métodos cuja persistência física ainda não foi integrada.
 */
@Injectable()
export class PrismaRepositorioMedicoes extends RepositorioMedicoes {
  constructor(private readonly contexto: ContextoPrisma) {
    super();
  }

  async salvar(_medicao: Medicao): Promise<void> {
    throw new FuncionalidadeIndisponivelErro('Persistência funcional de medições ainda não implementada.');
  }

  async buscarPorId(_id: string, _titularId: string): Promise<Medicao | null> {
    throw new FuncionalidadeIndisponivelErro('Consulta de medição por id ainda não implementada.');
  }

  async listar(_filtros: FiltrosMedicao, _titularId: string): Promise<Medicao[]> {
    throw new FuncionalidadeIndisponivelErro('Listagem de medições ainda não implementada.');
  }

  async excluir(_id: string, _titularId: string): Promise<boolean> {
    throw new FuncionalidadeIndisponivelErro('Exclusão de medição ainda não implementada.');
  }
}
