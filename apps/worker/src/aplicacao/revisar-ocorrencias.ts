import { AgendaDeDoses } from '../dominio/agenda-de-doses';
import { RepositorioDeAgendamentos } from '../portas/agendamentos';
import { TratamentoAlterado } from '../portas/eventos';
import { RepositorioOcorrencias } from '../portas/ocorrencias';

export class RevisarOcorrencias {
  constructor(
    readonly agenda: AgendaDeDoses,
    readonly ocorrencias: RepositorioOcorrencias,
    readonly agendamentos: RepositorioDeAgendamentos,
  ) {}

  async executar(_evento: TratamentoAlterado): Promise<void> {
    throw new Error('Revisão de ocorrências ainda não implementada.');
  }
}
