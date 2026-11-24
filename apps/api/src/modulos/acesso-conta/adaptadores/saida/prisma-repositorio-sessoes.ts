import { Injectable } from '@nestjs/common';
import { ContextoPrisma } from '../../../../compartilhado/adaptadores/contexto-prisma';
import { Sessao } from '../../dominio/sessao';
import { RepositorioSessoes } from '../../portas/repositorio-sessoes';

@Injectable()
export class PrismaRepositorioSessoes extends RepositorioSessoes {
  constructor(private readonly contexto: ContextoPrisma) {
    super();
  }

  async salvar(sessao: Sessao): Promise<void> {
    const { id, ...dados } = sessao.paraGravacao();
    await this.contexto.cliente.sessao.upsert({
      where: { id },
      create: { id, ...dados },
      update: { revogadaEm: dados.revogadaEm, tokenEntrega: dados.tokenEntrega },
    });
  }

  async buscarPorHashDoToken(tokenHash: string): Promise<Sessao | null> {
    const linha = await this.contexto.cliente.sessao.findUnique({ where: { tokenHash } });
    return linha ? Sessao.restaurar(linha) : null;
  }

  async buscar(titularId: string, id: string): Promise<Sessao | null> {
    const linha = await this.contexto.cliente.sessao.findFirst({ where: { id, titularId } });
    return linha ? Sessao.restaurar(linha) : null;
  }

  async listarAtivas(titularId: string): Promise<Sessao[]> {
    const linhas = await this.contexto.cliente.sessao.findMany({
      where: { titularId, revogadaEm: null },
      orderBy: [{ criadaEm: 'desc' }, { id: 'asc' }],
    });
    return linhas.map((linha) => Sessao.restaurar(linha));
  }
}
