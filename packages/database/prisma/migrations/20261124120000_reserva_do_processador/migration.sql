-- Processador de lembretes (ADR 03): cada reserva recebe um identificador.
-- Antes de enviar, a réplica confirma que a reserva ainda é dela; se o prazo
-- venceu e outra réplica assumiu, a primeira desiste em vez de enviar de novo.
ALTER TABLE "agendamentos" ADD COLUMN "reserva" UUID;
