import { TreatmentEvent } from '@personal-health/contracts';
import { RevisorOcorrencias } from '../portas/revisor-ocorrencias';

/** Routes shared treatment events to the reminder scheduler without calculating doses. */
export class RevisarOcorrenciasDeTratamento {
  constructor(private readonly revisor: RevisorOcorrencias) {}

  executar(evento: TreatmentEvent): Promise<void> {
    if (evento.type === 'TreatmentChanged') return this.revisor.revisar(evento);
    return this.revisor.encerrar(evento);
  }
}
