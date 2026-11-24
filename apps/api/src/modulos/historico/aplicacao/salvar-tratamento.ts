import { PublicadorEventos } from '@personal-health/contracts';
import { RecursoIndisponivelErro } from '../../../compartilhado/dominio/erros';
import { UnidadeDeTrabalho } from '../../../compartilhado/portas/unidade-de-trabalho';
import { AlteracaoTratamento, NovoTratamento, Tratamento } from '../dominio/tratamento';
import { RepositorioTratamentos } from '../portas/repositorio-tratamentos';

export class SaveTreatmentUseCase {
  constructor(
    private readonly tratamentos: RepositorioTratamentos,
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly publicador: PublicadorEventos,
  ) {}

  executar(comando: Omit<NovoTratamento, 'titularId' | 'id'>, titularId: string): Promise<Tratamento> {
    const agora = new Date();
    return this.unidadeDeTrabalho.executar(async () => {
      const tratamento = Tratamento.registrar({ ...comando, titularId }, agora);
      await this.tratamentos.salvar(tratamento);
      await this.publicador.publicar(tratamento.eventoAlterado(agora));
      return tratamento;
    });
  }

  alterar(
    tratamentoId: string,
    comando: AlteracaoTratamento,
    titularId: string,
  ): Promise<Tratamento> {
    const agora = new Date();
    return this.unidadeDeTrabalho.executar(async () => {
      const atual = await this.tratamentos.buscarPorId(tratamentoId, titularId);
      if (!atual) throw new RecursoIndisponivelErro();
      const tratamento = atual.alterar(comando);
      await this.tratamentos.salvar(tratamento);
      await this.publicador.publicar(tratamento.eventoAlterado(agora));
      return tratamento;
    });
  }
}
