import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TreatmentChanged, TreatmentEnded } from '@personal-health/contracts';
import { RevisarOcorrenciasDeTratamento } from '../../src/aplicacao/revisar-ocorrencias-de-tratamento';
import { RevisorOcorrencias } from '../../src/portas/revisor-ocorrencias';

class RevisorEmMemoria extends RevisorOcorrencias {
  revisoes: TreatmentChanged[] = [];
  encerramentos: TreatmentEnded[] = [];

  async revisar(tratamento: TreatmentChanged): Promise<void> {
    this.revisoes.push(tratamento);
  }

  async encerrar(tratamento: TreatmentEnded): Promise<void> {
    this.encerramentos.push(tratamento);
  }
}

describe('Worker: revisão das ocorrências de tratamento', () => {
  it('encaminha alteração e encerramento pelo contrato compartilhado', async () => {
    const revisor = new RevisorEmMemoria();
    const handler = new RevisarOcorrenciasDeTratamento(revisor);
    const alterado: TreatmentChanged = {
      type: 'TreatmentChanged',
      originId: 'tratamento-1',
      holderId: 'titular-1',
      version: 2,
      frequency: { type: 'FIXA', intervalHours: 8 },
      startsAt: new Date('2026-11-24T08:00:00Z'),
      endsAt: null,
      initialTime: '08:00',
      occurredAt: new Date('2026-11-24T12:00:00Z'),
      eventId: 'evento-1',
    };
    const encerrado: TreatmentEnded = {
      type: 'TreatmentEnded',
      originId: 'tratamento-1',
      holderId: 'titular-1',
      version: 3,
      endedAt: new Date('2026-11-25T12:00:00Z'),
      occurredAt: new Date('2026-11-25T12:00:00Z'),
      eventId: 'evento-2',
    };

    await handler.executar(alterado);
    await handler.executar(encerrado);

    assert.deepEqual(revisor.revisoes, [alterado]);
    assert.deepEqual(revisor.encerramentos, [encerrado]);
  });
});
