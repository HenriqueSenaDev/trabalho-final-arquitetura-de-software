import { Injectable } from '@nestjs/common';
import { FuncionalidadeIndisponivelErro } from '../../../../compartilhado/dominio/erros';
import { PrismaService } from '../../../../compartilhado/adaptadores/prisma.service';
import { Tratamento } from '../../dominio/tratamento';
import { RepositorioTratamentos } from '../../portas/repositorio-tratamentos';

@Injectable()
export class PrismaRepositorioTratamentos extends RepositorioTratamentos {
  constructor(_prisma: PrismaService) {
    super();
  }

  async salvar(_tratamento: Tratamento): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async buscarPorId(_id: string, _titularId: string): Promise<Tratamento | null> {
    throw new FuncionalidadeIndisponivelErro();
  }

  async listarPorTitular(_titularId: string): Promise<Tratamento[]> {
    throw new FuncionalidadeIndisponivelErro();
  }
}
