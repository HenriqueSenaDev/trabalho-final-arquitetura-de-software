import { Injectable } from '@nestjs/common';
import { PublicadorEventos, TreatmentEvent } from '@personal-health/contracts';
import { FuncionalidadeIndisponivelErro } from '../../../../compartilhado/dominio/erros';

@Injectable()
export class PublicadorEventosAdapter extends PublicadorEventos {
  /** The real adapter must publish through the caller's UnitOfWork connection. */
  async publicar(_evento: TreatmentEvent): Promise<void> {
    throw new FuncionalidadeIndisponivelErro();
  }
}
