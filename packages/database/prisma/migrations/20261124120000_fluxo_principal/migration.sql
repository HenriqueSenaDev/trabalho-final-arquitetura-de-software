-- Fluxo principal: sessões por aparelho, trilha de auditoria, campos de consulta
-- (profissional, local, retorno) e versão nos lembretes e avisos (ADR 03 e 04).

-- CreateEnum
CREATE TYPE "audit_outcome" AS ENUM ('SUCCESS', 'DENIED', 'REJECTED', 'ERROR');

-- DropIndex
DROP INDEX "notification_deliveries_reminder_id_scheduled_for_key";

-- AlterTable
ALTER TABLE "health_records" ADD COLUMN     "follow_up_at" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "professional" TEXT;

-- AlterTable
ALTER TABLE "notification_deliveries" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "reminders" ADD COLUMN     "record_id" UUID,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "holder_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device" VARCHAR(80) NOT NULL,
    "delivery_token" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "holder_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "outcome" "audit_outcome" NOT NULL,
    "reference" VARCHAR(120),
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_holder_id_revoked_at_idx" ON "sessions"("holder_id", "revoked_at");

-- CreateIndex
CREATE INDEX "audit_logs_holder_id_at_idx" ON "audit_logs"("holder_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_reminder_id_version_key" ON "notification_deliveries"("reminder_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_record_id_key" ON "reminders"("record_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "holders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

