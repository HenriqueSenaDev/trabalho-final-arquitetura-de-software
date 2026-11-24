import { Injectable } from '@nestjs/common';
import { ContextoPrisma } from '../../../../compartilhado/adaptadores/contexto-prisma';
import { FuncionalidadeIndisponivelErro } from '../../../../compartilhado/dominio/erros';
import {
  EvolucaoIndicador,
  LeituraIndicadores,
  PeriodoConsulta,
} from '../../portas/leitura-indicadores';

/**
 * Adaptador de leitura que implementa LeituraIndicadores via Prisma.
 * Como funcionalidade secundária do modelo C3/C4, declara a dependência
 * com o contexto Prisma e assina a recuperação de séries cronológicas sem interpretação clínica.
 */
@Injectable()
export class PrismaLeituraIndicadores extends LeituraIndicadores {
  constructor(private readonly contexto: ContextoPrisma) {
    super();
  }

  async consultarEvolucao(
    _tipo: string,
    _periodo: PeriodoConsulta,
    _titularId: string,
  ): Promise<EvolucaoIndicador> {
    throw new FuncionalidadeIndisponivelErro('Consulta de evolução de indicadores ainda não implementada.');
  }
}
