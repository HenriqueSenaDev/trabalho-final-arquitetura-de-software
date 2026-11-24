import { Injectable } from '@nestjs/common';
import { ContextoPrisma } from '../../../../compartilhado/adaptadores/contexto-prisma';
import { Consulta } from '../../dominio/consulta';
import { RepositorioConsultas } from '../../portas/repositorio-consultas';

/** Adaptador relacional que satisfaz a porta RepositorioConsultas. */
@Injectable()
export class PrismaRepositorioConsultas extends RepositorioConsultas {
  constructor(private readonly contexto: ContextoPrisma) {
    super();
  }

  async inserir(consulta: Consulta): Promise<boolean> {
    // ON CONFLICT DO NOTHING: um pedido repetido (mesmo id) não gera erro nem duplica.
    const { count } = await this.contexto.cliente.consulta.createMany({
      data: [consulta.paraLeitura()],
      skipDuplicates: true,
    });
    return count === 1;
  }

  async salvar(consulta: Consulta): Promise<void> {
    const { id, titularId, ...dados } = consulta.paraLeitura();
    await this.contexto.cliente.consulta.updateMany({
      where: { id, titularId },
      data: dados,
    });
  }

  async buscar(titularId: string, id: string): Promise<Consulta | null> {
    const linha = await this.contexto.cliente.consulta.findFirst({
      where: { id, titularId },
    });
    return linha ? Consulta.restaurar(linha) : null;
  }

  async excluir(titularId: string, id: string): Promise<boolean> {
    const { count } = await this.contexto.cliente.consulta.deleteMany({
      where: { id, titularId },
    });
    return count === 1;
  }
}
