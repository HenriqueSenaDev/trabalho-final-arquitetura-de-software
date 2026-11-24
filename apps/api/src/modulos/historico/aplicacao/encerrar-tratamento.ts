import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { PublicadorEventos } from '@personal-health/contracts';
import { UnidadeDeTrabalho } from '../../../compartilhado/portas/unidade-de-trabalho';
import { RepositorioTratamentos } from '../portas/repositorio-tratamentos';

export class EncerrarTratamento {
  constructor(
    private readonly tratamentos: RepositorioTratamentos,
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly publicador: PublicadorEventos,
  ) {}

  async executar(tratamentoId: string, titularId: string): Promise<void> {
    await this.unidadeDeTrabalho.executar(async () => {
      const atual = await this.tratamentos.buscarPorId(tratamentoId, titularId);
      if (!atual) throw new RecursoIndisponivelErro();
      const agora = new Date();
      const encerrado = atual.encerrar(agora);
      await this.tratamentos.salvar(encerrado);
      await this.publicador.publicar(encerrado.eventoEncerrado(agora));
    });
  }
}
