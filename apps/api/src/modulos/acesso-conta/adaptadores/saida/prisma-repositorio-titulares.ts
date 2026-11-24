import { Injectable } from '@nestjs/common';
import { ContextoPrisma } from '../../../../compartilhado/adaptadores/contexto-prisma';
import { Titular } from '../../dominio/titular';
import { RepositorioTitulares } from '../../portas/repositorio-titulares';

@Injectable()
export class PrismaRepositorioTitulares extends RepositorioTitulares {
  constructor(private readonly contexto: ContextoPrisma) {
    super();
  }

  async buscarPorEmail(email: string): Promise<Titular | null> {
    const linha = await this.contexto.cliente.titular.findUnique({ where: { email } });
    return linha ? Titular.restaurar(linha) : null;
  }
}
