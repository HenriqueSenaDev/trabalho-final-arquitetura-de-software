import { TreatmentChanged, TreatmentEnded } from '@personal-health/contracts';

/** Boundary to the reminder scheduler; dose occurrence rules live behind it. */
export abstract class RevisorOcorrencias {
  abstract revisar(tratamento: TreatmentChanged): Promise<void>;
  abstract encerrar(tratamento: TreatmentEnded): Promise<void>;
}
