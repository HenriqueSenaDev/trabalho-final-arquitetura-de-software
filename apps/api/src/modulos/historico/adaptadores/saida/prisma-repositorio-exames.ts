import { Injectable } from '@nestjs/common';
import { FuncionalidadeIndisponivelErro } from '../../../../compartilhado/dominio/erros';
import { PrismaService } from '../../../../compartilhado/adaptadores/prisma.service';
import { Exame } from '../../dominio/exame';
import { RepositorioExames } from '../../portas/repositorio-exames';

@Injectable()
export class PrismaRepositorioExames extends RepositorioExames {
  constructor(_prisma: PrismaService) {
    super();
  }

  async salvar(_exame: Exame): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async buscarPorId(_id: string, _titularId: string): Promise<Exame | null> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async listarPorTitular(_titularId: string): Promise<Exame[]> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async excluir(_id: string, _titularId: string): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }
}
